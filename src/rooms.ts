// Chambers are hand-drawn and only their population is random. That keeps the
// labyrinth legible --- a layout you can read at a glance --- while enemy
// kinds and positions still differ from run to run.
//
//   #  wall        .  floor
//   P  Theseus     E  the way out
//   o  a spawn slot (more slots than enemies; the engine picks which fill)
//   M  the Minotaur

import type { EnemyKind } from "./types.ts";
import { type Rng, pick, sample } from "./rng.ts";

export const GRID = 9;

/**
 * The opening chamber, and the only one that is taught rather than generated.
 * Theseus stands in a stub of corridor; the way out is visible and barred
 * three tiles ahead; a single guard holds the middle of the room. Walking up
 * twice is safe, and the third step is the one that meets the guard.
 */
const INTRO = [
  "#########",
  "####E####",
  "####.####",
  "###...###",
  "###.o.###",
  "###...###",
  "####.####",
  "####P####",
  "#########",
];

const CHAMBERS = [
  [
    "#########",
    "#...E...#",
    "#.#...#.#",
    "#..o.o..#",
    "#.#...#.#",
    "#..o.o..#",
    "#.#...#.#",
    "#...P...#",
    "#########",
  ],
  [
    "#########",
    "#...E...#",
    "#.o...o.#",
    "#..###..#",
    "#o.....o#",
    "#..###..#",
    "#...o...#",
    "#...P...#",
    "#########",
  ],
  [
    "#########",
    "#..E....#",
    "#.......#",
    "#.o...o.#",
    "#...#...#",
    "#.#...#.#",
    "#..o.o..#",
    "#...P...#",
    "#########",
  ],
  [
    "#########",
    "#...E...#",
    "#.#.#.#.#",
    "#o.....o#",
    "#.#.#.#.#",
    "#..o.o..#",
    "#.#.#.#.#",
    "#...P...#",
    "#########",
  ],
];

const BOSS = [
  "#########",
  "#.......#",
  "#..#.#..#",
  "#.......#",
  "#...M...#",
  "#.......#",
  "#..#.#..#",
  "#...P...#",
  "#########",
];

export interface RoomPlan {
  walls: string[];
  start: { x: number; y: number };
  exit: { x: number; y: number } | null;
  spawns: { x: number; y: number; kind: EnemyKind }[];
  boss: boolean;
}

/** How many enemies each chamber fields, and what it may field them as. */
const WAVES: { count: number; kinds: EnemyKind[] }[] = [
  { count: 1, kinds: ["skeleton"] },
  { count: 2, kinds: ["skeleton", "skeleton", "harpy"] },
  { count: 3, kinds: ["skeleton", "harpy", "gorgon"] },
  { count: 4, kinds: ["skeleton", "harpy", "gorgon", "gorgon"] },
];

export const CHAMBER_COUNT = 5;

/** Chambers that hand out a blessing once cleared. */
export const BLESSING_AFTER = new Set([2, 3]);

function parse(rows: string[]): {
  walls: string[];
  start: { x: number; y: number };
  exit: { x: number; y: number } | null;
  slots: { x: number; y: number }[];
  bossAt: { x: number; y: number } | null;
} {
  const walls: string[] = [];
  const slots: { x: number; y: number }[] = [];
  let start = { x: 4, y: 7 };
  let exit: { x: number; y: number } | null = null;
  let bossAt: { x: number; y: number } | null = null;

  rows.forEach((row, y) => {
    [...row].forEach((cell, x) => {
      if (cell === "#") walls.push(`${x},${y}`);
      else if (cell === "P") start = { x, y };
      else if (cell === "E") exit = { x, y };
      else if (cell === "o") slots.push({ x, y });
      else if (cell === "M") bossAt = { x, y };
    });
  });

  return { walls, start, exit, slots, bossAt };
}

export function buildRoom(chamber: number, rng: Rng): RoomPlan {
  if (chamber === 0) {
    const { walls, start, exit, slots } = parse(INTRO);
    return {
      walls,
      start,
      exit,
      // The guard is fixed, not sampled: the first chamber has one lesson to
      // teach and teaches it the same way every run.
      spawns: slots.map((s) => ({ ...s, kind: "skeleton" as const })),
      boss: false,
    };
  }

  if (chamber >= CHAMBER_COUNT - 1) {
    const { walls, start, exit, bossAt } = parse(BOSS);
    return {
      walls,
      start,
      exit,
      spawns: bossAt ? [{ ...(bossAt as { x: number; y: number }), kind: "minotaur" as const }] : [],
      boss: true,
    };
  }

  const { walls, start, exit, slots } = parse(pick(rng, CHAMBERS));
  const wave = WAVES[Math.min(chamber, WAVES.length - 1)]!;
  const places = sample(rng, slots, wave.count);
  const kinds = sample(rng, wave.kinds, places.length);

  return {
    walls,
    start,
    exit,
    spawns: places.map((p, i) => ({ ...p, kind: kinds[i] ?? "skeleton" })),
    boss: false,
  };
}
