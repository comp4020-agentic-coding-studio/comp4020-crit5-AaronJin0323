// Everything the player sees. The engine says what happened; this decides what
// that looks like. It owns no rules --- if a question can be answered without a
// browser, it belongs in the engine, not here.

import { creatureArt, godArt, heartArt, heroArt } from "./art.ts";
import type { Engine } from "./engine.ts";
import type { God, GodId, Vec } from "./types.ts";
import { CHAMBER_COUNT } from "./rooms.ts";

const el = <T extends HTMLElement>(sel: string): T => {
  const found = document.querySelector<T>(sel);
  if (!found) throw new Error(`missing element: ${sel}`);
  return found;
};

/** How long a resolved attack stays on screen. Matches the CSS animations. */
const FX_MS = 380;

export class View {
  private stage = el(".stage");
  private board = el("[data-board]");
  private actors = el("[data-actors]");
  private threadLine = el<SVGPolylineElement & HTMLElement>("[data-thread-line]");
  private hint = el("[data-start]");
  private hearts = el("[data-hearts]");
  private chambers = el("[data-chambers]");
  private gifts = el("[data-gifts]");
  private bossPanel = el("[data-boss]");
  private bossFill = el("[data-boss-fill]");
  private gift = el("[data-gift]");
  private gods = el("[data-gods]");
  private ending = el("[data-ending]");
  private verdict = el("[data-verdict]");
  private tally = el("[data-tally]");
  private favour = el("[data-favour]");

  private tiles: HTMLElement[] = [];
  private sprites = new Map<number, HTMLElement>();
  private hero = document.createElement("div");
  private size = 9;

  // ------------------------------------------------------------- the room

  drawRoom(game: Engine): void {
    this.size = game.size;
    this.stage.style.setProperty("--grid", String(this.size));
    this.board.replaceChildren();
    this.actors.replaceChildren();
    this.sprites.clear();
    this.tiles = [];

    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        const tile = document.createElement("i");
        const wall = game.isWall({ x, y });
        tile.className = wall ? "tile wall" : "tile floor";
        if (game.exit && game.exit.x === x && game.exit.y === y) tile.classList.add("gate");
        this.board.append(tile);
        this.tiles.push(tile);
      }
    }

    this.hero = document.createElement("div");
    this.hero.className = "actor hero";
    this.hero.innerHTML = heroArt();
    this.actors.append(this.hero);

    for (const e of game.enemies) {
      const sprite = document.createElement("div");
      sprite.className = `actor foe foe-${e.kind}`;
      // The Minotaur counts his wounds on the bar over the arena; pips as well
      // would be the same number said twice, and seven of them under one tile.
      const pips = e.kind === "minotaur" ? "" : `<span class="pips">${"<i></i>".repeat(e.maxHp)}</span>`;
      sprite.innerHTML = creatureArt(e.kind) + pips;
      this.actors.append(sprite);
      this.sprites.set(e.id, sprite);
    }

    this.bossPanel.hidden = !game.bossRoom;
    this.sync(game);
  }

  // ------------------------------------------------------- every-turn draw

  sync(game: Engine): void {
    this.place(this.hero, game.player.pos);
    this.hero.classList.toggle("sharp", game.aresCharged);
    this.hero.classList.toggle("warded", game.aegis);

    for (const [id, sprite] of this.sprites) {
      const foe = game.enemies.find((e) => e.id === id);
      if (!foe) {
        sprite.classList.add("gone");
        setTimeout(() => sprite.remove(), 320);
        this.sprites.delete(id);
        continue;
      }
      this.place(sprite, foe.pos);
      sprite.classList.toggle("windup", game.isWindingUp(id));
      sprite.classList.toggle("stunned", foe.stunned > 0);
      sprite.classList.toggle("hurt", foe.hp < foe.maxHp);
      const pips = sprite.querySelectorAll<HTMLElement>(".pips i");
      pips.forEach((pip, i) => pip.classList.toggle("spent", i >= foe.hp));
    }

    const marked = new Set(game.markedTiles().map((v) => v.y * this.size + v.x));
    this.tiles.forEach((tile, i) => tile.classList.toggle("marked", marked.has(i)));

    const gate = game.exit ? this.tiles[game.exit.y * this.size + game.exit.x] : null;
    gate?.classList.toggle("open", game.exitOpen);

    // The chevron sits on the tile the first press would reach, so it points
    // at a destination rather than merely upwards.
    this.place(this.hint, { x: game.player.pos.x, y: game.player.pos.y - 1 });
    this.hint.hidden = game.stirred || game.chamber > 0;
    this.drawThread(game.trail);
    this.drawHearts(game);
    this.drawChambers(game);
    this.drawGifts(game);
    this.drawBoss(game);
  }

  private place(node: HTMLElement, at: Vec): void {
    node.style.setProperty("--x", String(at.x));
    node.style.setProperty("--y", String(at.y));
  }

  /** Ariadne's thread, drawn through the centre of every tile walked. */
  private drawThread(trail: Vec[]): void {
    this.threadLine.setAttribute(
      "points",
      trail.map((v) => `${v.x + 0.5},${v.y + 0.5}`).join(" "),
    );
  }

  private drawHearts(game: Engine): void {
    const want = game.player.maxHearts;
    if (this.hearts.children.length !== want) {
      this.hearts.innerHTML = heartArt().repeat(want);
    }
    [...this.hearts.children].forEach((node, i) => {
      node.classList.toggle("spent", i >= game.player.hearts);
    });
  }

  private drawChambers(game: Engine): void {
    if (this.chambers.children.length !== CHAMBER_COUNT) {
      this.chambers.innerHTML = "<li></li>".repeat(CHAMBER_COUNT);
    }
    [...this.chambers.children].forEach((node, i) => {
      node.classList.toggle("done", i < game.chambersCleared);
      node.classList.toggle("here", i === game.chamber && game.phase === "playing");
      node.classList.toggle("lair", i === CHAMBER_COUNT - 1);
    });
  }

  /** The gifts taken, and whether each one is ready to spend right now. */
  private drawGifts(game: Engine): void {
    const taken = game.favours();
    const signature = taken.map((g) => g.id).join(",");
    if (this.gifts.dataset.have !== signature) {
      this.gifts.dataset.have = signature;
      this.gifts.replaceChildren(
        ...taken.map((g) => {
          const card = document.createElement("span");
          card.className = `gift-chip chip-${g.id}`;
          card.title = `${g.name} --- ${g.effect}`;
          card.innerHTML =
            godArt(g.id) +
            (g.id === "hermes" ? `<span class="steps">${'<i></i>'.repeat(4)}</span>` : "");
          return card;
        }),
      );
    }

    for (const card of this.gifts.children) {
      const id = card.className.match(/chip-(\w+)/)?.[1] as GodId | undefined;
      if (id === "ares") card.classList.toggle("ready", game.aresCharged);
      if (id === "athena") {
        card.classList.toggle("ready", game.aegis);
        card.classList.toggle("spent", !game.aegis);
      }
      if (id === "hermes") {
        const lit = game.wingedSteps % 4;
        [...card.querySelectorAll(".steps i")].forEach((pip, i) =>
          pip.classList.toggle("lit", i < lit),
        );
        card.classList.toggle("ready", lit === 3);
      }
    }
  }

  private drawBoss(game: Engine): void {
    this.bossPanel.hidden = !game.bossRoom;
    if (!game.bossRoom) return;
    const boss = game.boss();
    const share = boss ? Math.max(0, boss.hp) / boss.maxHp : 0;
    this.bossFill.style.setProperty("--share", String(share));
    this.bossPanel.classList.toggle("open", Boolean(boss && boss.stunned > 0));
  }

  // ------------------------------------------------------------ animations

  /** A short-lived class on one actor. */
  flourish(id: number, cls: string, ms = 300): void {
    const sprite = this.sprites.get(id);
    if (!sprite) return;
    sprite.classList.add(cls);
    setTimeout(() => sprite.classList.remove(cls), ms);
  }

  heroFlourish(cls: string, ms = 300): void {
    this.hero.classList.add(cls);
    setTimeout(() => this.hero.classList.remove(cls), ms);
  }

  /** The whole board recoils. Used for wounds, crashes and the killing blow. */
  jolt(cls = "jolt"): void {
    this.stage.classList.add(cls);
    setTimeout(() => this.stage.classList.remove(cls), 420);
  }

  /** A beat of stillness on impact, so a hit registers as an event. */
  hitstop(): void {
    this.stage.classList.add("hitstop");
    setTimeout(() => this.stage.classList.remove("hitstop"), 90);
  }

  /** The white flash on the tile a blow landed on. */
  spark(at: Vec, tone = "gold"): void {
    const fx = document.createElement("div");
    fx.className = `fx spark tone-${tone}`;
    this.place(fx, at);
    this.actors.append(fx);
    setTimeout(() => fx.remove(), FX_MS);
  }

  /** A sword arc thrown from one tile into the next. */
  arc(from: Vec, to: Vec): void {
    const fx = document.createElement("div");
    fx.className = "fx arc";
    fx.style.setProperty("--turn", String(this.angle(from, to)));
    this.place(fx, to);
    this.actors.append(fx);
    setTimeout(() => fx.remove(), FX_MS);
  }

  /**
   * A resolved telegraph: a slash on one tile, or a beam or charge stretched
   * along however many tiles were marked.
   */
  lash(from: Vec, tiles: Vec[], kind: string): void {
    if (tiles.length === 0) return;
    const head = tiles[0]!;
    const tail = tiles[tiles.length - 1]!;
    const vertical = head.x === tail.x && tiles.length > 1;
    const fx = document.createElement("div");
    fx.className = `fx lash lash-${kind} ${vertical ? "down" : "across"}`;
    fx.style.setProperty("--len", String(tiles.length));
    fx.style.setProperty("--turn", String(this.angle(from, head)));
    this.place(fx, {
      x: Math.min(head.x, tail.x),
      y: Math.min(head.y, tail.y),
    });
    this.actors.append(fx);
    setTimeout(() => fx.remove(), FX_MS + 120);
  }

  private angle(from: Vec, to: Vec): number {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    if (dy < 0) return 0;
    if (dx > 0) return 0.25;
    if (dy > 0) return 0.5;
    return 0.75;
  }

  // -------------------------------------------------------------- overlays

  /**
   * The blessing cards. Mouse, touch, Left/Right and Enter/Space all work, and
   * the buttons are destroyed on close so nothing focusable is ever left
   * sitting behind an overlay.
   */
  offerGods(gods: readonly God[], take: (id: GodId) => void): void {
    const buttons = gods.map((g, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = `god god-${g.id}`;
      b.dataset.god = g.id;
      b.innerHTML = `
        <span class="god-art">${godArt(g.id)}</span>
        <span class="god-name">${g.name}</span>
        <span class="god-title">${g.title}</span>
        <span class="god-effect">${g.effect}</span>`;
      b.addEventListener("click", () => take(g.id));
      b.addEventListener("keydown", (event) => {
        const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
        if (step === 0) return;
        event.preventDefault();
        const next = (i + step + buttons.length) % buttons.length;
        buttons[next]!.focus();
      });
      return b;
    });

    this.gods.replaceChildren(...buttons);
    this.gift.hidden = false;
    requestAnimationFrame(() => buttons[0]?.focus());
  }

  closeGods(): void {
    this.gift.hidden = true;
    this.gods.replaceChildren();
  }

  // ---------------------------------------------------------------- ending

  finish(game: Engine): void {
    const won = game.phase === "won";
    this.ending.dataset.ended = won ? "win" : "loss";
    this.verdict.textContent = won ? "THE THREAD HOLDS" : "THE THREAD BREAKS";

    this.tally.replaceChildren();
    const rows: [string, string][] = [
      ["CHAMBERS", `${game.chambersCleared} / ${CHAMBER_COUNT}`],
      ["LIFE", `${Math.max(0, game.player.hearts)} / ${game.player.maxHearts}`],
    ];
    for (const [label, value] of rows) {
      const dt = document.createElement("dt");
      dt.textContent = label;
      const dd = document.createElement("dd");
      dd.textContent = value;
      this.tally.append(dt, dd);
    }

    this.favour.replaceChildren(
      ...game.favours().map((g) => {
        const chip = document.createElement("span");
        chip.className = `gift-chip chip-${g.id}`;
        chip.innerHTML = `${godArt(g.id)}<em>${g.title}</em>`;
        return chip;
      }),
    );

    this.stage.classList.toggle("daylight", won);
    this.ending.hidden = false;
    requestAnimationFrame(() => el<HTMLButtonElement>("[data-again]").focus());
  }

  reset(): void {
    this.ending.hidden = true;
    this.ending.dataset.ended = "";
    this.stage.classList.remove("daylight");
    this.closeGods();
  }
}
