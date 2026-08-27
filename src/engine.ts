// The rules of the labyrinth. No DOM, no timers, no randomness that isn't
// seeded --- so a whole run can be replayed inside a test.
//
// The one rule everything else hangs off: a move and an attack are the same
// keypress. Step into empty floor and you travel; step into a foe and you
// strike instead, staying where you are. Every move is therefore a choice
// about where you will be standing when the marked tiles go off.

import {
  DIRS,
  type Dir,
  type Enemy,
  type EnemyKind,
  type GameEvent,
  type God,
  type GodId,
  type Phase,
  type Telegraph,
  type Vec,
  add,
  adjacent,
  eq,
  key,
} from "./types.ts";
import { BLESSING_AFTER, CHAMBER_COUNT, GRID, buildRoom } from "./rooms.ts";
import { type Rng, mulberry32, sample } from "./rng.ts";

export const GODS: readonly God[] = [
  { id: "zeus", name: "ZEUS", symbol: "⚡", effect: "Strikes leap to a neighbour" },
  { id: "poseidon", name: "POSEIDON", symbol: "🌊", effect: "Strikes hurl foes back" },
  { id: "athena", name: "ATHENA", symbol: "🦉", effect: "Turn the first wound" },
  { id: "artemis", name: "ARTEMIS", symbol: "🏹", effect: "Every third strike doubles" },
  { id: "ares", name: "ARES", symbol: "🔥", effect: "A kill sharpens the blade" },
  { id: "hermes", name: "HERMES", symbol: "💨", effect: "Sometimes a second step" },
];

const HP: Record<EnemyKind, number> = { skeleton: 2, harpy: 1, gorgon: 2, minotaur: 4 };

/** How far a kind travels in one turn. */
const SPEED: Record<EnemyKind, number> = { skeleton: 1, harpy: 2, gorgon: 1, minotaur: 1 };

export class Engine {
  readonly size = GRID;
  walls = new Set<string>();
  player = { pos: { x: 4, y: 7 } as Vec, hearts: 3, maxHearts: 3 };
  enemies: Enemy[] = [];
  telegraphs: Telegraph[] = [];
  exit: Vec | null = null;
  exitOpen = false;
  chamber = 0;
  chambersCleared = 0;
  blessings: GodId[] = [];
  offer: God[] = [];
  phase: Phase = "playing";
  /** False until the very first keypress lands, which is what retires the hint. */
  stirred = false;
  bossRoom = false;

  private rng: Rng;
  private nextId = 1;
  private strikes = 0;
  private aresTurns = 0;
  private shieldSpent = false;
  private queued = 0;

  constructor(seed: number = Date.now()) {
    this.rng = mulberry32(seed);
    this.loadChamber(0);
  }

  // --- queries ----------------------------------------------------------

  inBounds = (v: Vec): boolean => v.x >= 0 && v.y >= 0 && v.x < this.size && v.y < this.size;
  isWall = (v: Vec): boolean => this.walls.has(key(v));
  enemyAt = (v: Vec): Enemy | undefined => this.enemies.find((e) => eq(e.pos, v));
  hasBlessing = (id: GodId): boolean => this.blessings.includes(id);

  /** Somewhere an enemy could stand: on the board, not rock, not already taken. */
  private free(v: Vec): boolean {
    return this.inBounds(v) && !this.isWall(v) && !this.enemyAt(v) && !eq(v, this.player.pos);
  }

  /** Every tile currently marked for an attack, flattened for the renderer. */
  dangerTiles(): Vec[] {
    return this.telegraphs.flatMap((t) => t.tiles);
  }

  // --- setup ------------------------------------------------------------

  private loadChamber(index: number): void {
    const plan = buildRoom(index, this.rng);
    this.chamber = index;
    this.walls = new Set(plan.walls);
    this.player.pos = { ...plan.start };
    this.exit = plan.exit;
    this.exitOpen = false;
    this.telegraphs = [];
    this.bossRoom = plan.boss;
    this.shieldSpent = false;
    this.aresTurns = 0;
    this.enemies = plan.spawns.map((s) => ({
      id: this.nextId++,
      kind: s.kind,
      pos: { x: s.x, y: s.y },
      hp: HP[s.kind],
      maxHp: HP[s.kind],
      stunned: 0,
      // The opening guard holds its ground, so the first two steps are safe.
      stationary: index === 0,
    }));
    if (this.enemies.length === 0) this.exitOpen = true;

    // Crossing a threshold gives a heart back, to a maximum of three. Without
    // it a run is decided by whichever chamber went badly rather than by the
    // Minotaur, and there is no way to recover from an early mistake --- which
    // is the opposite of "try again, you have learnt something".
    if (index > 0) {
      this.player.hearts = Math.min(this.player.maxHearts, this.player.hearts + 1);
    }
  }

  restart(seed: number = Date.now()): void {
    this.rng = mulberry32(seed);
    this.player.hearts = this.player.maxHearts;
    this.blessings = [];
    this.offer = [];
    this.phase = "playing";
    this.chambersCleared = 0;
    this.strikes = 0;
    this.stirred = false;
    this.loadChamber(0);
  }

  // --- the turn ---------------------------------------------------------

  input(dir: Dir): GameEvent[] {
    if (this.phase !== "playing") return [];
    const ev: GameEvent[] = [];
    const step = DIRS[dir];
    const target = add(this.player.pos, step);

    // Walking into rock costs nothing. Wasting a turn on a mistyped key would
    // punish exactly the experimenting the opening is trying to invite.
    if (!this.inBounds(target) || this.isWall(target)) {
      ev.push({ t: "blocked", at: target });
      return ev;
    }

    this.stirred = true;
    const foe = this.enemyAt(target);
    if (foe) {
      ev.push(...this.strike(foe, step));
    } else {
      ev.push({ t: "move", from: { ...this.player.pos }, to: { ...target } });
      this.player.pos = { ...target };
    }

    // Tiles marked last turn go off now: one move is all you ever get.
    ev.push(...this.resolveTelegraphs());
    if (this.phase !== "playing") return ev;

    if (this.hasBlessing("hermes") && this.rng() < 0.25) {
      ev.push({ t: "freeStep" });
    } else {
      ev.push(...this.enemyTurn());
    }
    if (this.aresTurns > 0) this.aresTurns--;

    ev.push(...this.settle());
    return ev;
  }

  /** Accept the offered god and step into the next chamber. */
  choose(id: GodId): GameEvent[] {
    if (this.phase !== "blessing") return [];
    this.blessings.push(id);
    this.offer = [];
    this.phase = "playing";
    this.loadChamber(this.queued);
    return [{ t: "exit" }];
  }

  // --- player actions ---------------------------------------------------

  private strike(foe: Enemy, step: Vec): GameEvent[] {
    const ev: GameEvent[] = [];
    const at = { ...foe.pos };
    this.strikes++;

    // The Minotaur's hide turns a blade. Only the crash leaves it open, and
    // the ringing clang is the whole explanation the player gets.
    if (foe.kind === "minotaur" && foe.stunned === 0) {
      ev.push({ t: "clang", at });
      return ev;
    }

    // A blow that lands interrupts the wind-up: whatever this foe marked on
    // its last turn goes out with it. Without this, a foe standing next to you
    // marks the tile you are on, so every single strike traded a heart --- the
    // opening chamber charged the player a third of their life for working out
    // what the sword does. Two foes closing at once still only let you
    // interrupt one, so which one you hit is still the decision.
    this.telegraphs = this.telegraphs.filter((t) => t.ownerId !== foe.id);

    let damage = 1;
    if (this.hasBlessing("artemis") && this.strikes % 3 === 0) damage *= 2;
    if (this.hasBlessing("ares") && this.aresTurns > 0) damage += 1;

    const killed = this.wound(foe, damage);
    ev.push({ t: "attack", id: foe.id, at, damage, killed });
    if (killed && this.hasBlessing("ares")) this.aresTurns = 3;

    if (this.hasBlessing("zeus")) {
      const near = this.enemies.find((e) => e.id !== foe.id && adjacent(e.pos, at));
      if (near) {
        const chainAt = { ...near.pos };
        const chainKilled = this.wound(near, 1);
        ev.push({ t: "chain", id: near.id, at: chainAt, killed: chainKilled });
      }
    }

    if (!killed && this.hasBlessing("poseidon")) {
      const dest = add(foe.pos, step);
      if (this.free(dest)) {
        const from = { ...foe.pos };
        foe.pos = { ...dest };
        ev.push({ t: "push", from, to: { ...dest } });
      }
    }

    return ev;
  }

  /** Returns true if the wound was fatal. A corpse's marked tiles go with it. */
  private wound(foe: Enemy, damage: number): boolean {
    foe.hp -= damage;
    if (foe.hp > 0) return false;
    this.enemies = this.enemies.filter((e) => e.id !== foe.id);
    this.telegraphs = this.telegraphs.filter((t) => t.ownerId !== foe.id);
    return true;
  }

  private hurt(): GameEvent[] {
    if (this.hasBlessing("athena") && !this.shieldSpent) {
      this.shieldSpent = true;
      return [{ t: "shielded", at: { ...this.player.pos } }];
    }
    this.player.hearts--;
    const ev: GameEvent[] = [{ t: "hurt", at: { ...this.player.pos } }];
    if (this.player.hearts <= 0) {
      this.phase = "lost";
      ev.push({ t: "lost" });
    }
    return ev;
  }

  // --- the labyrinth answers -------------------------------------------

  private resolveTelegraphs(): GameEvent[] {
    const ev: GameEvent[] = [];
    const pending = this.telegraphs;
    this.telegraphs = [];
    for (const t of pending) {
      const owner = this.enemies.find((e) => e.id === t.ownerId);
      if (!owner) continue;
      if (t.kind === "charge") {
        ev.push(...this.resolveCharge(owner, t));
      } else if (t.tiles.some((tile) => eq(tile, this.player.pos))) {
        ev.push(...this.hurt());
      }
      if (this.phase === "lost") break;
    }
    return ev;
  }

  private resolveCharge(m: Enemy, t: Telegraph): GameEvent[] {
    const ev: GameEvent[] = [];
    let hit = false;
    let dest = m.pos;
    for (const tile of t.tiles) {
      // Theseus stops the charge with his body rather than being run through.
      if (eq(tile, this.player.pos)) {
        hit = true;
        break;
      }
      if (this.enemies.some((e) => e.id !== m.id && eq(e.pos, tile))) break;
      dest = tile;
    }
    m.pos = { ...dest };
    ev.push({ t: "charge", path: t.tiles, hit });
    if (hit) ev.push(...this.hurt());
    // A stun has to be long enough to be worth answering. It is decremented
    // once more by the enemy turn that follows this one, so 3 buys two blows
    // and 2 buys one --- and it wakes faster the more it is wounded, which is
    // the "again, but harder" the fight is built on.
    m.stunned = m.hp > 2 ? 3 : 2;
    ev.push({ t: "stunned", at: { ...m.pos } });
    return ev;
  }

  private enemyTurn(): GameEvent[] {
    const ev: GameEvent[] = [];
    for (const e of [...this.enemies]) {
      if (!this.enemies.includes(e)) continue;
      if (e.stunned > 0) {
        e.stunned--;
        continue;
      }
      if (e.kind === "gorgon") ev.push(...this.gorgonTurn(e));
      else if (e.kind === "minotaur") ev.push(...this.minotaurTurn(e));
      else ev.push(...this.stalkerTurn(e));
    }
    return ev;
  }

  /** Skeletons and harpies: close the distance, then mark where you stand. */
  private stalkerTurn(e: Enemy): GameEvent[] {
    if (!adjacent(e.pos, this.player.pos) && !e.stationary) {
      for (let i = 0; i < SPEED[e.kind]; i++) {
        if (adjacent(e.pos, this.player.pos)) break;
        if (!this.stepToward(e)) break;
      }
    }
    if (adjacent(e.pos, this.player.pos)) return this.mark(e, [{ ...this.player.pos }], "strike");
    return [];
  }

  /** Gorgons: line up, then mark the whole row or column until it meets rock. */
  private gorgonTurn(e: Enemy): GameEvent[] {
    const line = this.lineToPlayer(e);
    if (line) return this.mark(e, line, "strike");
    this.stepToward(e);
    return [];
  }

  private minotaurTurn(m: Enemy): GameEvent[] {
    const line = this.lineToPlayer(m);
    if (line) return this.mark(m, line, "charge");
    // Half-dead, it hunts at a run: it finds your row or column in one turn
    // instead of two, so the gap between charges closes as the fight goes on.
    this.stepToward(m);
    if (m.hp <= 2 && !this.lineToPlayer(m)) this.stepToward(m);
    return [];
  }

  /**
   * The tiles from an enemy toward the player along a shared row or column,
   * running until they hit rock or the edge. Null if they aren't lined up.
   */
  private lineToPlayer(e: Enemy): Vec[] | null {
    const p = this.player.pos;
    if (e.pos.x !== p.x && e.pos.y !== p.y) return null;
    const dir = { x: Math.sign(p.x - e.pos.x), y: Math.sign(p.y - e.pos.y) };
    if (dir.x === 0 && dir.y === 0) return null;
    const tiles: Vec[] = [];
    let c = add(e.pos, dir);
    while (this.inBounds(c) && !this.isWall(c)) {
      tiles.push({ ...c });
      c = add(c, dir);
    }
    return tiles.length > 0 ? tiles : null;
  }

  private mark(e: Enemy, tiles: Vec[], kind: Telegraph["kind"]): GameEvent[] {
    this.telegraphs.push({ ownerId: e.id, tiles, kind });
    return [{ t: "telegraph", tiles }];
  }

  private stepToward(e: Enemy): boolean {
    const dx = this.player.pos.x - e.pos.x;
    const dy = this.player.pos.y - e.pos.y;
    const opts: Vec[] = [];
    const horizontalFirst = Math.abs(dx) >= Math.abs(dy);
    const h = { x: Math.sign(dx), y: 0 };
    const v = { x: 0, y: Math.sign(dy) };
    if (horizontalFirst) {
      if (dx !== 0) opts.push(h);
      if (dy !== 0) opts.push(v);
    } else {
      if (dy !== 0) opts.push(v);
      if (dx !== 0) opts.push(h);
    }
    for (const d of opts) {
      const next = add(e.pos, d);
      if (this.free(next)) {
        e.pos = next;
        return true;
      }
    }
    return false;
  }

  // --- end of turn ------------------------------------------------------

  private settle(): GameEvent[] {
    const ev: GameEvent[] = [];

    if (this.enemies.length === 0 && !this.exitOpen) {
      this.exitOpen = true;
      ev.push({ t: "roomClear" });
    }

    // The boss chamber has no door: killing the Minotaur is the way out.
    if (this.bossRoom && this.enemies.length === 0) {
      this.chambersCleared = CHAMBER_COUNT;
      this.phase = "won";
      ev.push({ t: "won" });
      return ev;
    }

    if (this.exit && this.exitOpen && eq(this.player.pos, this.exit)) {
      this.chambersCleared = this.chamber + 1;
      this.queued = this.chamber + 1;
      const unseen = GODS.filter((g) => !this.hasBlessing(g.id));
      if (BLESSING_AFTER.has(this.chamber) && unseen.length >= 2) {
        this.offer = sample(this.rng, unseen, 2);
        this.phase = "blessing";
        ev.push({ t: "blessing" });
        return ev;
      }
      this.loadChamber(this.queued);
      ev.push({ t: "exit" });
    }

    return ev;
  }
}
