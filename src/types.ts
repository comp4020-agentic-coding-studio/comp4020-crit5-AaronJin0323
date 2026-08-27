// Shared vocabulary for the engine. Nothing in here touches the DOM: the
// engine decides what happened, the renderer decides how it looks.

export interface Vec {
  x: number;
  y: number;
}

export type Dir = "up" | "down" | "left" | "right";

export const DIRS: Record<Dir, Vec> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export type EnemyKind = "skeleton" | "gorgon" | "harpy" | "minotaur";

export type GodId = "zeus" | "poseidon" | "athena" | "artemis" | "ares" | "hermes";

export interface God {
  id: GodId;
  name: string;
  symbol: string;
  /** Three or four words. Long enough to promise something, short enough to read at a glance. */
  effect: string;
}

export interface Enemy {
  id: number;
  kind: EnemyKind;
  pos: Vec;
  hp: number;
  maxHp: number;
  /** Turns left frozen. The Minotaur is only woundable while this is above zero. */
  stunned: number;
  /** The intro chamber's guard holds its ground, so the first moves are safe. */
  stationary?: boolean;
}

/** A marked attack. Drawn this turn, resolved after the player's next move. */
export interface Telegraph {
  ownerId: number;
  tiles: Vec[];
  kind: "strike" | "charge";
}

export type Phase = "playing" | "blessing" | "won" | "lost";

/** What the engine did, in order, so the renderer can animate it. */
export type GameEvent =
  | { t: "move"; from: Vec; to: Vec }
  | { t: "blocked"; at: Vec }
  | { t: "attack"; at: Vec; damage: number; killed: boolean }
  | { t: "clang"; at: Vec }
  | { t: "chain"; at: Vec; killed: boolean }
  | { t: "push"; from: Vec; to: Vec }
  | { t: "hurt"; at: Vec }
  | { t: "shielded"; at: Vec }
  | { t: "telegraph"; tiles: Vec[] }
  | { t: "charge"; path: Vec[]; hit: boolean }
  | { t: "stunned"; at: Vec }
  | { t: "freeStep" }
  | { t: "roomClear" }
  | { t: "exit" }
  | { t: "blessing" }
  | { t: "won" }
  | { t: "lost" };

export const eq = (a: Vec, b: Vec): boolean => a.x === b.x && a.y === b.y;
export const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
export const key = (v: Vec): string => `${v.x},${v.y}`;
export const manhattan = (a: Vec, b: Vec): number =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
export const adjacent = (a: Vec, b: Vec): boolean => manhattan(a, b) === 1;
