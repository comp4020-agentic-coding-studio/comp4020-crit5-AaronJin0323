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

/** Three foes, one lesson each: bump it, dodge it, bait it. */
export type EnemyKind = "skeleton" | "medusa" | "minotaur";

export type GodId = "ares" | "hermes" | "athena";

export interface God {
  id: GodId;
  /** The god. */
  name: string;
  /** The gift, named --- what the player will remember it as. */
  title: string;
  /** One concrete sentence. No hedging words: it either does this or it doesn't. */
  effect: string;
}

export interface Enemy {
  id: number;
  kind: EnemyKind;
  pos: Vec;
  hp: number;
  maxHp: number;
  /** Enemy turns it will sit out. The Minotaur is only woundable above zero. */
  stunned: number;
  /** The opening guard holds its ground, so the first steps are always safe. */
  stationary?: boolean;
}

/**
 * A marked attack. The one rule the whole game rests on: these tiles are drawn
 * now, they never move, and they go off after the player's next valid move.
 * `kind` only decides how it is drawn when it lands.
 */
export interface Telegraph {
  ownerId: number;
  tiles: Vec[];
  kind: "slash" | "beam" | "charge";
  /** Unit vector from the attacker toward its mark, for the resolve animation. */
  dir: Vec;
}

export type Phase = "playing" | "blessing" | "won" | "lost";

/** What the engine did, in order, so the renderer can animate it. */
export type GameEvent =
  | { t: "move"; from: Vec; to: Vec }
  | { t: "blocked"; at: Vec }
  | { t: "attack"; id: number; at: Vec; damage: number; killed: boolean }
  | { t: "clang"; at: Vec }
  | { t: "hurt"; at: Vec }
  | { t: "shielded"; at: Vec }
  | { t: "telegraph"; id: number; tiles: Vec[]; kind: Telegraph["kind"] }
  // A marked attack going off, whether or not anyone was standing in it.
  | { t: "lash"; id: number; from: Vec; tiles: Vec[]; kind: Telegraph["kind"]; hit: boolean }
  | { t: "stunned"; at: Vec }
  | { t: "aresCharged" }
  | { t: "winged"; from: Vec; to: Vec }
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
