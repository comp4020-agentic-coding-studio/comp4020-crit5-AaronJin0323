// Wiring: keys in, engine turn, then a flourish per thing that happened.

import { Engine, GODS } from "./src/engine.ts";
import { View } from "./src/render.ts";
import { Sound } from "./src/audio.ts";
import type { Dir, GameEvent, GodId } from "./src/types.ts";

const game = new Engine();
const view = new View();
const sound = new Sound();

const KEYS: Record<string, Dir> = {
  arrowup: "up",
  w: "up",
  arrowdown: "down",
  s: "down",
  arrowleft: "left",
  a: "left",
  arrowright: "right",
  d: "right",
};

function react(ev: GameEvent): void {
  switch (ev.t) {
    case "move":
      sound.step();
      break;
    case "blocked":
      sound.bump();
      break;
    case "attack":
      sound.strike();
      view.spark(ev.at);
      if (ev.killed) sound.kill();
      else view.flourish(ev.id, "struck", 240);
      break;
    case "chain":
      sound.zap();
      view.spark(ev.at, "#cfe9ff");
      if (!ev.killed) view.flourish(ev.id, "struck", 240);
      break;
    case "clang":
      sound.clang();
      view.spark(ev.at, "#e8e2d0");
      break;
    case "hurt":
      sound.hurt();
      view.jolt();
      view.heroFlourish("wounded", 340);
      break;
    case "shielded":
      sound.ward();
      view.heroFlourish("warded", 520);
      break;
    case "charge":
      sound.charge();
      if (ev.hit) view.jolt();
      break;
    case "roomClear":
      sound.door();
      break;
    case "exit":
      sound.door();
      break;
    case "blessing":
      sound.gift();
      break;
    case "won":
      sound.win();
      break;
    case "lost":
      sound.lose();
      break;
    case "push":
    case "telegraph":
    case "stunned":
    case "freeStep":
      break;
  }
}

// Read through a call, so the compiler doesn't narrow `phase` at the guard
// and then disbelieve the engine when a turn changes it.
const playing = (): boolean => game.phase === "playing";

function turn(dir: Dir): void {
  if (!playing()) return;
  const events = game.input(dir);
  view.sync(game);
  for (const ev of events) react(ev);

  if (game.phase === "blessing") {
    view.offerGods(game.offer, take);
  } else if (game.phase === "won" || game.phase === "lost") {
    // Hold on the frozen room for a beat before the verdict lands.
    setTimeout(() => view.finish(game, GODS), 520);
  }
}

function take(id: GodId): void {
  game.choose(id);
  view.closeGods();
  view.sync(game);
  sound.door();
}

window.addEventListener("keydown", (e) => {
  const dir = KEYS[e.key.toLowerCase()];
  if (!dir) return;
  e.preventDefault();
  turn(dir);
});

// Swiping, so the labyrinth is not desktop-only.
let touch: { x: number; y: number } | null = null;
addEventListener("touchstart", (e) => {
  const t = e.changedTouches[0];
  touch = t ? { x: t.clientX, y: t.clientY } : null;
}, { passive: true });
addEventListener("touchend", (e) => {
  const t = e.changedTouches[0];
  if (!touch || !t) return;
  const dx = t.clientX - touch.x;
  const dy = t.clientY - touch.y;
  touch = null;
  if (Math.hypot(dx, dy) < 24) return;
  if (Math.abs(dx) > Math.abs(dy)) turn(dx > 0 ? "right" : "left");
  else turn(dy > 0 ? "down" : "up");
}, { passive: true });

document.querySelector("[data-again]")?.addEventListener("click", () => {
  game.restart();
  view.reset();
  view.drawRoom(game);
  view.sync(game);
});

const mute = document.querySelector<HTMLButtonElement>("[data-mute]");
mute?.addEventListener("click", () => {
  sound.muted = !sound.muted;
  mute.setAttribute("aria-pressed", String(sound.muted));
});

view.drawRoom(game);
view.sync(game);
