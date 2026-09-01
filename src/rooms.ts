// Five hand-composed chambers, in a fixed order, with fixed populations. The
// labyrinth is the same every run on purpose: each chamber teaches exactly one
// thing, and a player who died to a mistake gets to come back and answer it.
//
//   #  wall          .  floor
//   P  Theseus       E  the way out
//   g  the opening guard (one wound and it falls)
//   s  a skeleton --- walks at you, marks the tile you stand on
//   m  a medusa   --- holds still, marks the whole line she shares with you
//   M  the Minotaur
//
// Every chamber opens with Theseus on a wide row, so whatever is marked first
// there is always a tile to step onto instead.

import type { EnemyKind } from "./types.ts";

export const GRID = 9;
export const CHAMBER_COUNT = 5;

/**
 * Chambers that hand out a blessing once cleared, by index. The brief's
 * "after chambers 1 and 3" --- the first, to reward the very first kill, and
 * the third, just before the two hard rooms.
 */
export const BLESSING_AFTER = new Set([0, 2]);

/**
 * 1 --- the lesson is "move into it". Theseus at the bottom of a corridor, one
 * guard two tiles ahead, the barred way out in plain sight beyond it. One step
 * to learn that the chevron means walk; the next step is the kill.
 */
const ONE = [
  "#########",
  "####E####",
  "###...###",
  "###...###",
  "###...###",
  "####g####",
  "###...###",
  "####P####",
  "#########",
];

/**
 * 2 --- the lesson is the telegraph. One pursuer in an open room with pillars,
 * so there is always somewhere to step when it marks your tile.
 */
const TWO = [
  "#########",
  "#...E...#",
  "#.......#",
  "#..#.#..#",
  "#...s...#",
  "#..#.#..#",
  "#.......#",
  "#...P...#",
  "#########",
];

/**
 * 3 --- the lesson is the line. The medusa starts on Theseus's own column, so
 * her first mark is the whole of it and the answer is one step sideways.
 */
const THREE = [
  "#########",
  "#...E...#",
  "#.......#",
  "#...m...#",
  "#.#...#.#",
  "#.......#",
  "#.#...#.#",
  "#...P...#",
  "#########",
];

/**
 * 4 --- both at once. The medusa is the near threat and the skeletons are the
 * far one, so the room is read front-to-back rather than all in one turn.
 */
const FOUR = [
  "#########",
  "#...E...#",
  "#..s.s..#",
  "#.......#",
  "#.#...#.#",
  "#...m...#",
  "#.......#",
  "#...P...#",
  "#########",
];

/**
 * 5 --- the Minotaur. Long clear lines for it to charge down and pillars for
 * it to crash into, and no exit: the only way out is through him.
 */
const BOSS = [
  "#########",
  "#.......#",
  "#.......#",
  "#..#.#..#",
  "#...M...#",
  "#..#.#..#",
  "#.......#",
  "#...P...#",
  "#########",
];

const LAYOUTS = [ONE, TWO, THREE, FOUR, BOSS];

export interface Spawn {
  x: number;
  y: number;
  kind: EnemyKind;
  hp: number;
  /** Holds its ground. Only the opening guard does. */
  stationary?: boolean;
}

export interface RoomPlan {
  walls: string[];
  start: { x: number; y: number };
  exit: { x: number; y: number } | null;
  spawns: Spawn[];
  boss: boolean;
}

/** What each map letter spawns. The opening guard is the only one-wound foe. */
const ROSTER: Record<string, Omit<Spawn, "x" | "y">> = {
  g: { kind: "skeleton", hp: 1, stationary: true },
  s: { kind: "skeleton", hp: 2 },
  m: { kind: "medusa", hp: 2 },
  // Seven, so one crash window is not the whole fight. Measured, not chosen:
  // at three he died inside a single stun and the encounter was one trick
  // performed once; at seven the bot needs two crashes for a median fight of
  // fifteen turns, which is bait, punish, watch him get up, bait again.
  M: { kind: "minotaur", hp: 7 },
};

export function buildRoom(chamber: number): RoomPlan {
  const rows = LAYOUTS[Math.min(chamber, LAYOUTS.length - 1)]!;
  const walls: string[] = [];
  const spawns: Spawn[] = [];
  let start = { x: 4, y: 7 };
  let exit: { x: number; y: number } | null = null;

  rows.forEach((row, y) => {
    [...row].forEach((cell, x) => {
      if (cell === "#") walls.push(`${x},${y}`);
      else if (cell === "P") start = { x, y };
      else if (cell === "E") exit = { x, y };
      else {
        const spec = ROSTER[cell];
        if (spec) spawns.push({ x, y, ...spec });
      }
    });
  });

  return { walls, start, exit, spawns, boss: rows === BOSS };
}
