// Everything that touches the DOM. It reads engine state and never changes
// it, so a rule can be tested without a browser and a look can be reworked
// without touching a rule.

import { CHAMBER_COUNT } from "./rooms.ts";
import type { Engine } from "./engine.ts";
import { creatureArt, heroArt } from "./art.ts";
import { type God, type GodId, type Vec, key } from "./types.ts";

const HERO = 0;

const grab = <T extends HTMLElement>(sel: string): T => {
  const el = document.querySelector<T>(sel);
  if (!el) throw new Error(`missing ${sel}`);
  return el;
};

export class View {
  private stage = grab("[data-stage]");
  private board = grab("[data-board]");
  private actorLayer = grab("[data-actors]");
  private hint = grab("[data-start]");
  private heartRow = grab("[data-hearts]");
  private pipRow = grab("[data-chambers]");
  private bossBox = grab("[data-boss]");
  private bossFill = grab("[data-boss-fill]");
  private gift = grab("[data-gift]");
  private godRow = grab("[data-gods]");
  private ending = grab("[data-ending]");
  private verdict = grab("[data-verdict]");
  private tally = grab("[data-tally]");
  private favour = grab("[data-favour]");

  private tiles = new Map<string, HTMLElement>();
  private sprites = new Map<number, HTMLElement>();
  private drawn = -1;

  /** Rebuild the floor and repopulate it. Only when the chamber changes. */
  drawRoom(game: Engine): void {
    this.tiles.clear();
    this.sprites.clear();
    this.board.replaceChildren();
    this.actorLayer.replaceChildren();

    for (let y = 0; y < game.size; y++) {
      for (let x = 0; x < game.size; x++) {
        const at = { x, y };
        const tile = document.createElement("div");
        const wall = game.isWall(at);
        tile.className = wall ? "tile wall" : "tile floor";
        if (!wall && (x + y) % 2 === 1) tile.classList.add("alt");
        if (game.exit && game.exit.x === x && game.exit.y === y) {
          tile.className = "tile exit";
        }
        this.tiles.set(key(at), tile);
        this.board.append(tile);
      }
    }

    this.sprites.set(HERO, this.sprite("actor hero", heroArt(), game.player.pos));
    for (const foe of game.enemies) {
      this.sprites.set(foe.id, this.sprite(`actor ${foe.kind}`, creatureArt(foe.kind), foe.pos));
    }
    this.drawn = game.chamber;
  }

  private sprite(cls: string, art: string, at: Vec): HTMLElement {
    const el = document.createElement("div");
    el.className = cls;
    el.innerHTML = art;
    place(el, at);
    this.actorLayer.append(el);
    return el;
  }

  /** Bring the picture back in line with the state, whatever just happened. */
  sync(game: Engine): void {
    if (game.chamber !== this.drawn) this.drawRoom(game);

    const danger = new Set(game.dangerTiles().map(key));
    for (const [at, tile] of this.tiles) {
      tile.classList.toggle("danger", danger.has(at));
    }
    if (game.exit) {
      this.tiles.get(key(game.exit))?.classList.toggle("open", game.exitOpen);
    }

    const hero = this.sprites.get(HERO);
    if (hero) place(hero, game.player.pos);

    const alive = new Set(game.enemies.map((e) => e.id));
    for (const [id, el] of this.sprites) {
      if (id === HERO || alive.has(id)) continue;
      this.sprites.delete(id);
      el.classList.add("dying");
      setTimeout(() => el.remove(), 300);
    }
    for (const foe of game.enemies) {
      let el = this.sprites.get(foe.id);
      if (!el) {
        el = this.sprite(`actor ${foe.kind}`, creatureArt(foe.kind), foe.pos);
        this.sprites.set(foe.id, el);
      }
      place(el, foe.pos);
      el.classList.toggle("stunned", foe.stunned > 0);
    }

    this.heartRow.replaceChildren(
      ...Array.from({ length: game.player.maxHearts }, (_, i) => {
        const h = document.createElement("div");
        h.className = i < game.player.hearts ? "heart" : "heart spent";
        return h;
      }),
    );

    this.pipRow.replaceChildren(
      ...Array.from({ length: CHAMBER_COUNT }, (_, i) => {
        const p = document.createElement("div");
        p.className = "pip";
        if (i < game.chamber) p.classList.add("done");
        if (i === game.chamber) p.classList.add("here");
        return p;
      }),
    );

    const boss = game.enemies.find((e) => e.kind === "minotaur");
    this.bossBox.hidden = !boss;
    if (boss) this.bossFill.style.width = `${(boss.hp / boss.maxHp) * 100}%`;

    // The chevron sits on the open floor ahead of Theseus, and leaves for
    // good the instant he takes a step.
    if (game.stirred) {
      this.hint.classList.add("spent");
    } else {
      const ahead = { x: game.player.pos.x, y: game.player.pos.y - 1 };
      place(this.hint, game.isWall(ahead) ? game.player.pos : ahead);
    }
  }

  /** A brief class on one actor, for an impact or a flinch. */
  flourish(id: number, cls: string, ms = 340): void {
    const el = this.sprites.get(id);
    if (!el) return;
    el.classList.remove(cls);
    void el.offsetWidth; // restart the animation rather than ignore a repeat
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), ms);
  }

  heroFlourish(cls: string, ms = 500): void {
    this.flourish(HERO, cls, ms);
  }

  jolt(): void {
    this.stage.classList.remove("jolt");
    void this.stage.offsetWidth;
    this.stage.classList.add("jolt");
    setTimeout(() => this.stage.classList.remove("jolt"), 240);
  }

  spark(at: Vec, tone = "#f3cd6b"): void {
    const s = document.createElement("div");
    s.className = "spark";
    s.style.setProperty("--tone", tone);
    place(s, at);
    this.actorLayer.append(s);
    setTimeout(() => s.remove(), 420);
  }

  offerGods(gods: readonly God[], take: (id: GodId) => void): void {
    this.godRow.replaceChildren(
      ...gods.map((g) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "god";
        b.innerHTML =
          `<span class="symbol">${g.symbol}</span>` +
          `<span class="name">${g.name}</span>` +
          `<span class="effect">${g.effect}</span>`;
        b.addEventListener("click", () => take(g.id));
        return b;
      }),
    );
    this.gift.hidden = false;
    this.godRow.querySelector("button")?.focus();
  }

  closeGods(): void {
    this.gift.hidden = true;
  }

  finish(game: Engine, gods: readonly God[]): void {
    const won = game.phase === "won";
    this.ending.dataset.ended = won ? "win" : "loss";
    this.verdict.textContent = won
      ? "The labyrinth releases you"
      : "The labyrinth claims another hero";

    this.tally.replaceChildren();
    for (const [label, value] of [
      ["Chambers", `${game.chambersCleared} / ${CHAMBER_COUNT}`],
      ["Favour", String(game.blessings.length)],
    ]) {
      const dt = document.createElement("dt");
      dt.textContent = label!;
      const dd = document.createElement("dd");
      dd.textContent = value!;
      this.tally.append(dt, dd);
    }

    this.favour.textContent = game.blessings
      .map((id) => gods.find((g) => g.id === id)?.symbol ?? "")
      .join(" ");
    this.ending.hidden = false;
    this.ending.querySelector<HTMLButtonElement>("[data-again]")?.focus();
  }

  reset(): void {
    this.ending.hidden = true;
    this.ending.dataset.ended = "";
    this.gift.hidden = true;
    this.hint.classList.remove("spent");
    this.drawn = -1;
  }
}

function place(el: HTMLElement, at: Vec): void {
  el.style.setProperty("--x", String(at.x));
  el.style.setProperty("--y", String(at.y));
}
