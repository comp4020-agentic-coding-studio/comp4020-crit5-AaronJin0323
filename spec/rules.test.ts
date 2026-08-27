// Focused tests for rules that are deterministic --- the ones where "right"
// and "wrong" are facts, not taste. Whether a charge feels fair, whether the
// opening teaches itself, and whether five minutes hold, are all settled by
// playing it and by the crit, not in here.

import { describe, expect, it } from "vitest";
import { Engine } from "../src/engine.ts";
import type { Enemy, EnemyKind } from "../src/types.ts";

const HP: Record<EnemyKind, number> = { skeleton: 2, harpy: 1, gorgon: 2, minotaur: 4 };

/** A bare walled room, so a rule can be tested without a chamber's furniture. */
function arena(): Engine {
  const e = new Engine(1);
  e.walls = new Set();
  for (let i = 0; i < e.size; i++) {
    e.walls.add(`${i},0`);
    e.walls.add(`${i},${e.size - 1}`);
    e.walls.add(`0,${i}`);
    e.walls.add(`${e.size - 1},${i}`);
  }
  e.enemies = [];
  e.telegraphs = [];
  e.exit = null;
  e.exitOpen = false;
  e.bossRoom = false;
  e.player.pos = { x: 4, y: 4 };
  e.player.hearts = 3;
  return e;
}

let ids = 0;
function foe(kind: EnemyKind, x: number, y: number): Enemy {
  return { id: ++ids, kind, pos: { x, y }, hp: HP[kind], maxHp: HP[kind], stunned: 0 };
}

describe("movement", () => {
  it("will not carry Theseus through rock, and costs him nothing to try", () => {
    const e = arena();
    e.player.pos = { x: 1, y: 1 };
    const skeleton = foe("skeleton", 6, 6);
    e.enemies = [skeleton];

    const events = e.input("left"); // (0,1) is the outer wall

    expect(e.player.pos).toEqual({ x: 1, y: 1 });
    expect(events).toEqual([{ t: "blocked", at: { x: 0, y: 1 } }]);
    // A mistyped key must not hand the labyrinth a free turn, or experimenting
    // with the controls --- the whole opening --- would punish the player.
    expect(skeleton.pos).toEqual({ x: 6, y: 6 });
  });

  it("strikes a foe instead of stepping onto it", () => {
    const e = arena();
    const skeleton = foe("skeleton", 4, 3);
    e.enemies = [skeleton];

    const events = e.input("up");

    expect(e.player.pos).toEqual({ x: 4, y: 4 });
    expect(skeleton.hp).toBe(1);
    expect(events.some((x) => x.t === "attack")).toBe(true);
  });
});

describe("a marked tile", () => {
  // The same board, one keypress apart: the only difference is whether
  // Theseus was still standing there when it went off. Two guards, because a
  // blow interrupts the foe it lands on --- so the mark under test belongs to
  // the one he doesn't swing at.
  function marked(): Engine {
    const e = arena();
    const guard = foe("skeleton", 5, 4);
    const other = foe("skeleton", 4, 5);
    e.enemies = [guard, other];
    e.telegraphs = [{ ownerId: other.id, tiles: [{ x: 4, y: 4 }], kind: "strike" }];
    return e;
  }

  it("wounds Theseus if he is still on it", () => {
    const e = marked();
    e.input("right"); // he turns on the other guard, so he never leaves the tile
    expect(e.player.hearts).toBe(2);
  });

  it("goes out when Theseus interrupts the foe that made it", () => {
    // Found by playing: a foe standing next to you marks the tile you are on,
    // so before this rule existed every exchange cost a heart and the opening
    // chamber charged a third of a life for learning what the sword does.
    const e = arena();
    const guard = foe("skeleton", 5, 4);
    e.enemies = [guard];
    e.telegraphs = [{ ownerId: guard.id, tiles: [{ x: 4, y: 4 }], kind: "strike" }];

    e.input("right");

    expect(e.player.hearts).toBe(3);
    expect(guard.hp).toBe(1);
  });

  it("misses him if he stepped away", () => {
    const e = marked();
    e.input("left"); // one move is all he gets, and it is enough
    expect(e.player.hearts).toBe(3);
  });

  it("dies with the foe that marked it", () => {
    const e = arena();
    const harpy = foe("harpy", 5, 4); // one wound kills it
    e.enemies = [harpy];
    e.telegraphs = [{ ownerId: harpy.id, tiles: [{ x: 4, y: 4 }], kind: "strike" }];

    e.input("right");

    expect(e.enemies).toHaveLength(0);
    expect(e.player.hearts).toBe(3);
  });
});

describe("the Minotaur", () => {
  it("turns a blade until the charge leaves it reeling", () => {
    const e = arena();
    const minotaur = foe("minotaur", 5, 4);
    e.enemies = [minotaur];
    e.bossRoom = true;

    // Against its own maxHp, not a number --- the rule is "a blade does
    // nothing until it is reeling", and that shouldn't break when the fight
    // gets retuned.
    const clang = e.input("right");
    expect(minotaur.hp).toBe(minotaur.maxHp);
    expect(clang.some((x) => x.t === "clang")).toBe(true);

    e.telegraphs = [];
    minotaur.stunned = 2;
    e.input("right");
    expect(minotaur.hp).toBe(minotaur.maxHp - 1);
  });
});

describe("the way out", () => {
  it("stays shut until the chamber is empty", () => {
    const e = new Engine(7); // the opening chamber, with its one guard
    expect(e.enemies).toHaveLength(1);
    expect(e.exitOpen).toBe(false);

    const guard = e.enemies[0]!;
    e.player.pos = { x: guard.pos.x, y: guard.pos.y + 1 };
    e.input("up");
    e.input("up");

    expect(e.enemies).toHaveLength(0);
    expect(e.exitOpen).toBe(true);
  });
});
