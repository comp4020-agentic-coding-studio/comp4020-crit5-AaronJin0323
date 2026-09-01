// Wiring. Keys and taps go in, engine events come back, and each one is turned
// into a sound and a piece of motion. Nothing here decides a rule.

import { Engine } from "./src/engine.ts";
import { View } from "./src/render.ts";
import { Sound } from "./src/audio.ts";
import type { Dir, GodId } from "./src/types.ts";

const game = new Engine();
const view = new View();
const sound = new Sound();

const KEYS: Record<string, Dir> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  a: "left",
  s: "down",
  d: "right",
  W: "up",
  A: "left",
  S: "down",
  D: "right",
};

function react(ev: ReturnType<Engine["input"]>[number]): void {
  switch (ev.t) {
    case "move":
      sound.step();
      break;

    case "winged":
      sound.wing();
      view.heroFlourish("winged", 320);
      break;

    case "blocked":
      sound.bump();
      break;

    case "attack": {
      view.arc(game.player.pos, ev.at);
      view.spark(ev.at, ev.killed ? "bone" : "gold");
      view.flourish(ev.id, "struck", 320);
      view.heroFlourish("lunge", 260);
      view.hitstop();
      if (ev.killed) {
        sound.kill();
        view.jolt("shudder");
      } else {
        sound.strike();
      }
      break;
    }

    case "clang":
      sound.clang();
      view.spark(ev.at, "stone");
      view.heroFlourish("rebuff", 300);
      break;

    case "aresCharged":
      sound.ward();
      break;

    case "telegraph":
      sound.charge();
      break;

    case "lash":
      view.lash(ev.from, ev.tiles, ev.kind);
      if (ev.kind === "charge") sound.stampede();
      else sound.swipe();
      break;

    case "stunned":
      sound.crash();
      view.jolt("shudder");
      view.spark(ev.at, "stone");
      break;

    case "hurt":
      sound.hurt();
      view.jolt();
      view.heroFlourish("wounded", 480);
      view.spark(ev.at, "blood");
      view.hitstop();
      break;

    case "shielded":
      sound.ward();
      view.heroFlourish("warded-flash", 520);
      view.spark(ev.at, "divine");
      break;

    case "roomClear":
      sound.door();
      break;

    case "exit":
      sound.gift();
      break;

    case "blessing":
      view.offerGods(game.offer, take);
      break;

    case "won":
      sound.win();
      view.jolt("shudder");
      setTimeout(() => view.finish(game), 700);
      break;

    case "lost":
      sound.lose();
      view.jolt();
      setTimeout(() => view.finish(game), 620);
      break;
  }
}

let chamber = game.chamber;

function turn(dir: Dir): void {
  if (game.phase !== "playing") return;
  const before = game.chamber;
  for (const ev of game.input(dir)) react(ev);
  if (game.chamber !== before || chamber !== game.chamber) {
    chamber = game.chamber;
    view.drawRoom(game);
  } else {
    view.sync(game);
  }
}

function take(id: GodId): void {
  view.closeGods();
  game.choose(id);
  chamber = game.chamber;
  view.drawRoom(game);
}

addEventListener("keydown", (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  const dir = KEYS[event.key];
  if (dir) {
    event.preventDefault();
    turn(dir);
  }
});

// Swipes, for a phone. Same four directions, same rules.
let touch: { x: number; y: number } | null = null;
addEventListener(
  "touchstart",
  (event) => {
    const t = event.changedTouches[0];
    touch = t ? { x: t.clientX, y: t.clientY } : null;
  },
  { passive: true },
);
addEventListener("touchend", (event) => {
  const t = event.changedTouches[0];
  if (!touch || !t) return;
  const dx = t.clientX - touch.x;
  const dy = t.clientY - touch.y;
  touch = null;
  if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
  turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
});

document.querySelector("[data-again]")?.addEventListener("click", () => {
  view.reset();
  game.restart();
  chamber = game.chamber;
  view.drawRoom(game);
});

const mute = document.querySelector<HTMLButtonElement>("[data-mute]");
mute?.addEventListener("click", () => {
  sound.muted = !sound.muted;
  mute.setAttribute("aria-pressed", String(sound.muted));
  mute.classList.toggle("off", sound.muted);
});

view.drawRoom(game);

