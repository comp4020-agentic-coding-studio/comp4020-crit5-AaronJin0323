// The rules. No DOM, no timers, no randomness: the same keys pressed in the
// same order always produce the same run, which is what lets a player learn
// the labyrinth instead of re-rolling it.
//
// The whole game rests on one promise, and every enemy keeps it:
//
//   A marked tile is attacked after the player's next valid move.
//
// Marks never move once drawn. Walking into a wall is not a move, so it costs
// nothing. Standing on a marked tile when it goes off is the only way to be
// wounded, and it is always avoidable when the mark appears.

import {
  type Dir,
  type Enemy,
  type EnemyKind,
  type GameEvent,
  type God,
  type GodId,
  type Phase,
  type Telegraph,
  type Vec,
  DIRS,
  add,
  eq,
  key,
  manhattan,
} from "./types.ts";
import { BLESSING_AFTER, CHAMBER_COUNT, GRID, buildRoom } from "./rooms.ts";

/** Three gifts. Each is a sentence with no "sometimes" in it. */
export const GODS: readonly God[] = [
  {
    id: "ares",
    name: "ARES",
    title: "Blood Momentum",
    effect: "After a kill, your next strike deals +1.",
  },
  {
    id: "hermes",
    name: "HERMES",
    title: "Winged Step",
    effect: "Every fourth move travels two tiles.",
  },
  {
    id: "athena",
    name: "ATHENA",
    title: "Aegis",
    effect: "Block the next wound.",
  },
];

/**
 * Enemy turns the Minotaur loses to a crash --- and so, player turns gained.
 * Sized by the arena, not by taste: he charges wall to wall, so the crash can
 * be most of the room away from wherever Theseus dodged to, and the window has
 * to be long enough to cross that. Bait him from near the wall he will hit and
 * the same window buys four blows instead of one; that gap is the skill.
 * Shortening it is not a difficulty knob: at four, one run in twenty never
 * lands a blow at all and the fight simply never ends. Length comes from
 * his health instead --- see the roster.
 */
const CRASH_STUN = 6;

/** How many of the player's own tiles the thread remembers, per chamber. */
const THREAD_LENGTH = 48;

export class Engine {
  readonly size = GRID;
  walls = new Set<string>();
  player = { pos: { x: 4, y: 7 } as Vec, hearts: 3, maxHearts: 3 };
  enemies: Enemy[] = [];
  telegraphs: Telegraph[] = [];
  /** Ariadne's thread: every tile Theseus has stood on in this chamber. */
  trail: Vec[] = [];
  exit: Vec | null = null;
  exitOpen = false;
  chamber = 0;
  chambersCleared = 0;
  blessings: GodId[] = [];
  offer: God[] = [];
  phase: Phase = "playing";
  /** False until the first key lands, so the opening chevron can retire. */
  stirred = false;
  bossRoom = false;

  // --- Blessing state. Public, because the HUD draws all three of these. ---
  /** Ares: a kill is banked and the next strike is sharpened. */
  aresCharged = false;
  /** Hermes: moves taken, mod four. Three lit pips mean the next one doubles. */
  wingedSteps = 0;
  /** Athena: one wound still to be turned aside. */
  aegis = false;

  private nextId = 1;
  /** Stunned during this very input --- so the count isn't spent immediately. */
  private stunnedNow = new Set<number>();

  constructor() {
    this.loadChamber(0);
  }

  // ------------------------------------------------------------------ setup

  private loadChamber(index: number): void {
    const plan = buildRoom(index);
    this.walls = new Set(plan.walls);
    this.player.pos = { ...plan.start };
    this.exit = plan.exit ? { ...plan.exit } : null;
    this.exitOpen = false;
    this.chamber = index;
    this.bossRoom = plan.boss;
    this.telegraphs = [];
    this.trail = [{ ...plan.start }];
    this.wingedSteps = 0;
    this.enemies = plan.spawns.map((s) => ({
      id: this.nextId++,
      kind: s.kind,
      pos: { x: s.x, y: s.y },
      hp: s.hp,
      maxHp: s.hp,
      stunned: 0,
      stationary: s.stationary,
    }));

    // A breath between chambers. Never above the three hearts you started with.
    if (index > 0 && this.player.hearts < this.player.maxHearts) this.player.hearts++;
  }

  restart(): void {
    this.nextId = 1;
    this.player.hearts = this.player.maxHearts;
    this.chambersCleared = 0;
    this.blessings = [];
    this.offer = [];
    this.phase = "playing";
    this.stirred = false;
    this.aresCharged = false;
    this.aegis = false;
    this.loadChamber(0);
  }

  // ------------------------------------------------------------- inspection

  isWall(v: Vec): boolean {
    return this.walls.has(key(v));
  }

  inBounds(v: Vec): boolean {
    return v.x >= 0 && v.y >= 0 && v.x < this.size && v.y < this.size;
  }

  enemyAt(v: Vec): Enemy | undefined {
    return this.enemies.find((e) => eq(e.pos, v));
  }

  /** Tiles currently marked for attack, for the renderer. */
  markedTiles(): Vec[] {
    return this.telegraphs.flatMap((t) => t.tiles);
  }

  /** Enemies mid-wind-up, so they can be drawn coiled rather than idle. */
  isWindingUp(id: number): boolean {
    return this.telegraphs.some((t) => t.ownerId === id);
  }

  hasBlessing(id: GodId): boolean {
    return this.blessings.includes(id);
  }

  boss(): Enemy | undefined {
    return this.enemies.find((e) => e.kind === "minotaur");
  }

  /** Blocked either by the labyrinth or by a body. */
  private passable(v: Vec): boolean {
    return this.inBounds(v) && !this.isWall(v) && !this.enemyAt(v);
  }

  // ------------------------------------------------------------------- turn

  /**
   * One key press. Returns everything that happened, in order.
   * A press into a wall returns a single `blocked` and consumes no turn.
   */
  input(dir: Dir): GameEvent[] {
    const ev: GameEvent[] = [];
    if (this.phase !== "playing") return ev;

    const step = DIRS[dir];
    const target = add(this.player.pos, step);

    if (!this.inBounds(target) || this.isWall(target)) {
      ev.push({ t: "blocked", at: target });
      return ev;
    }

    this.stirred = true;
    this.stunnedNow.clear();

    const foe = this.enemyAt(target);
    if (foe) {
      ev.push(...this.strike(foe));
    } else {
      ev.push(...this.walk(target, step));
    }

    // Everything marked last turn goes off now, wherever Theseus ended up.
    ev.push(...this.resolveTelegraphs());
    if (this.phase !== "playing") return ev;

    ev.push(...this.enemyTurn());
    ev.push(...this.settle());
    return ev;
  }

  private walk(target: Vec, step: Vec): GameEvent[] {
    const ev: GameEvent[] = [];
    ev.push({ t: "move", from: { ...this.player.pos }, to: { ...target } });
    this.moveTo(target);

    // Hermes. Every fourth move carries one tile further, in the same
    // direction, if there is anywhere to land. Never onto a foe: this is a
    // stride, not a charge.
    this.wingedSteps++;
    if (this.hasBlessing("hermes") && this.wingedSteps % 4 === 0) {
      const further = add(target, step);
      if (this.passable(further)) {
        ev.push({ t: "winged", from: { ...target }, to: { ...further } });
        this.moveTo(further);
      }
    }
    return ev;
  }

  private moveTo(v: Vec): void {
    this.player.pos = { ...v };
    this.trail.push({ ...v });
    if (this.trail.length > THREAD_LENGTH) this.trail.shift();
  }

  private strike(foe: Enemy): GameEvent[] {
    const ev: GameEvent[] = [];

    // The Minotaur's hide turns a blade unless the charge has just cost him
    // his footing. Baiting him into a wall is the only way through.
    if (foe.kind === "minotaur" && foe.stunned <= 0) {
      ev.push({ t: "clang", at: { ...foe.pos } });
      return ev;
    }

    const damage = 1 + (this.aresCharged ? 1 : 0);
    this.aresCharged = false;
    foe.hp -= damage;
    const killed = foe.hp <= 0;
    ev.push({ t: "attack", id: foe.id, at: { ...foe.pos }, damage, killed });

    if (killed) {
      this.enemies = this.enemies.filter((e) => e.id !== foe.id);
      // A dead thing does not finish its swing. Its marks come off the floor.
      this.telegraphs = this.telegraphs.filter((t) => t.ownerId !== foe.id);
      if (this.hasBlessing("ares")) {
        this.aresCharged = true;
        ev.push({ t: "aresCharged" });
      }
    }
    return ev;
  }

  // ------------------------------------------------------------- telegraphs

  private mark(owner: Enemy, tiles: Vec[], kind: Telegraph["kind"], dir: Vec): GameEvent {
    this.telegraphs.push({ ownerId: owner.id, tiles, kind, dir });
    return { t: "telegraph", id: owner.id, tiles, kind };
  }

  /**
   * Every mark laid last turn resolves, in the order it was laid. The tiles
   * are exactly the ones that were drawn: nothing re-aims, nothing spreads.
   */
  private resolveTelegraphs(): GameEvent[] {
    const ev: GameEvent[] = [];
    const pending = this.telegraphs;
    this.telegraphs = [];

    for (const t of pending) {
      const owner = this.enemies.find((e) => e.id === t.ownerId);
      if (!owner) continue;

      if (t.kind === "charge") {
        ev.push(...this.resolveCharge(owner, t));
      } else {
        const hit = t.tiles.some((tile) => eq(tile, this.player.pos));
        ev.push({
          t: "lash",
          id: owner.id,
          from: { ...owner.pos },
          tiles: t.tiles,
          kind: t.kind,
          hit,
        });
        if (hit) ev.push(...this.wound());
      }
      if (this.phase !== "playing") break;
    }
    return ev;
  }

  /** The Minotaur runs his marked line until something stops him. */
  private resolveCharge(m: Enemy, t: Telegraph): GameEvent[] {
    const ev: GameEvent[] = [];
    const path: Vec[] = [];
    let at = m.pos;
    let hit = false;
    let crashed = true;

    for (const tile of t.tiles) {
      if (!this.passable(tile) && !eq(tile, this.player.pos)) break;
      if (eq(tile, this.player.pos)) {
        // He runs into Theseus and stops dead. No wall, so no crash: the only
        // way to earn the opening is to be somewhere else.
        hit = true;
        crashed = false;
        break;
      }
      at = tile;
      path.push({ ...tile });
    }

    m.pos = { ...at };
    ev.push({ t: "lash", id: m.id, from: { ...t.tiles[0]! }, tiles: path, kind: "charge", hit });

    if (hit) {
      ev.push(...this.wound());
    } else if (crashed) {
      m.stunned = CRASH_STUN;
      this.stunnedNow.add(m.id);
      ev.push({ t: "stunned", at: { ...m.pos } });
    }
    return ev;
  }

  private wound(): GameEvent[] {
    const ev: GameEvent[] = [];
    if (this.aegis) {
      this.aegis = false;
      ev.push({ t: "shielded", at: { ...this.player.pos } });
      return ev;
    }
    this.player.hearts--;
    ev.push({ t: "hurt", at: { ...this.player.pos } });
    if (this.player.hearts <= 0) {
      this.phase = "lost";
      ev.push({ t: "lost" });
    }
    return ev;
  }

  // ----------------------------------------------------------- enemy brains

  private enemyTurn(): GameEvent[] {
    const ev: GameEvent[] = [];
    for (const e of [...this.enemies]) {
      if (!this.enemies.includes(e)) continue;

      // Stunned this very input: the count starts running next turn, not now.
      if (this.stunnedNow.has(e.id)) continue;
      if (e.stunned > 0) {
        e.stunned--;
        continue;
      }
      // Already wound up. It is committed to the mark it drew last turn.
      if (this.isWindingUp(e.id)) continue;
      if (e.stationary) continue;

      if (e.kind === "minotaur") ev.push(...this.minotaurTurn(e));
      else if (e.kind === "medusa") ev.push(...this.medusaTurn(e));
      else ev.push(...this.stalkerTurn(e));
    }
    return ev;
  }

  /** Skeletons close the distance, then mark the tile they mean to hit. */
  private stalkerTurn(e: Enemy): GameEvent[] {
    if (manhattan(e.pos, this.player.pos) === 1) {
      const dir = {
        x: Math.sign(this.player.pos.x - e.pos.x),
        y: Math.sign(this.player.pos.y - e.pos.y),
      };
      return [this.mark(e, [{ ...this.player.pos }], "slash", dir)];
    }
    this.stepToward(e);
    return [];
  }

  /**
   * Medusas never come to you. They wait until you share a row or column, and
   * then mark all of it --- so the answer is always a step off the line.
   */
  private medusaTurn(e: Enemy): GameEvent[] {
    const line = this.lineToPlayer(e);
    if (line) return [this.mark(e, line.tiles, "beam", line.dir)];
    this.stepToward(e);
    return [];
  }

  /**
   * The Minotaur only charges down a line he already shares with Theseus, so
   * standing in one is an invitation, and stepping out of it is the answer.
   */
  private minotaurTurn(e: Enemy): GameEvent[] {
    const line = this.lineToPlayer(e);
    if (line) {
      // The whole run, wall to wall --- not merely as far as Theseus.
      const tiles: Vec[] = [];
      let at = add(e.pos, line.dir);
      while (this.inBounds(at) && !this.isWall(at)) {
        tiles.push({ ...at });
        at = add(at, line.dir);
      }
      return [this.mark(e, tiles, "charge", line.dir)];
    }
    this.stepToward(e);
    return [];
  }

  /**
   * The unbroken run of tiles from an enemy to the player, when they share a
   * row or column with nothing in between. Null otherwise.
   */
  private lineToPlayer(e: Enemy): { tiles: Vec[]; dir: Vec } | null {
    const p = this.player.pos;
    if (e.pos.x !== p.x && e.pos.y !== p.y) return null;
    if (eq(e.pos, p)) return null;

    const dir = { x: Math.sign(p.x - e.pos.x), y: Math.sign(p.y - e.pos.y) };
    const tiles: Vec[] = [];
    let at = add(e.pos, dir);
    while (!eq(at, p)) {
      if (!this.inBounds(at) || this.isWall(at) || this.enemyAt(at)) return null;
      tiles.push({ ...at });
      at = add(at, dir);
    }
    tiles.push({ ...p });
    return { tiles, dir };
  }

  /** One tile closer, on the axis with the most ground to make up. */
  private stepToward(e: Enemy): void {
    const dx = this.player.pos.x - e.pos.x;
    const dy = this.player.pos.y - e.pos.y;
    const options: Vec[] =
      Math.abs(dx) >= Math.abs(dy)
        ? [
            { x: Math.sign(dx), y: 0 },
            { x: 0, y: Math.sign(dy) },
          ]
        : [
            { x: 0, y: Math.sign(dy) },
            { x: Math.sign(dx), y: 0 },
          ];

    for (const o of options) {
      if (o.x === 0 && o.y === 0) continue;
      const to = add(e.pos, o);
      if (this.passable(to) && !eq(to, this.player.pos)) {
        e.pos = to;
        return;
      }
    }
  }

  // ------------------------------------------------------------ after-turn

  private settle(): GameEvent[] {
    const ev: GameEvent[] = [];

    if (this.bossRoom) {
      if (!this.boss()) {
        this.chambersCleared = CHAMBER_COUNT;
        this.phase = "won";
        ev.push({ t: "won" });
      }
      return ev;
    }

    if (!this.exitOpen && this.enemies.length === 0) {
      this.exitOpen = true;
      ev.push({ t: "roomClear" });
    }

    if (this.exitOpen && this.exit && eq(this.player.pos, this.exit)) {
      this.chambersCleared = this.chamber + 1;
      ev.push({ t: "exit" });

      if (BLESSING_AFTER.has(this.chamber)) {
        const unseen = GODS.filter((g) => !this.hasBlessing(g.id));
        if (unseen.length > 0) {
          this.offer = unseen;
          this.phase = "blessing";
          ev.push({ t: "blessing" });
          return ev;
        }
      }
      this.loadChamber(this.chamber + 1);
    }
    return ev;
  }

  /** Take a god's gift and walk on into the next chamber. */
  choose(id: GodId): void {
    if (this.phase !== "blessing") return;
    if (!this.hasBlessing(id)) this.blessings.push(id);
    if (id === "athena") this.aegis = true;
    this.offer = [];
    this.phase = "playing";
    this.loadChamber(this.chamber + 1);
  }

  /** The named gifts taken this run, in the order they were taken. */
  favours(): God[] {
    return this.blessings
      .map((id) => GODS.find((g) => g.id === id))
      .filter((g): g is God => Boolean(g));
  }
}
