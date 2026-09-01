// Focused tests for the rules that are facts rather than taste. Whether the
// opening teaches itself, whether the Minotaur feels fair, and whether a run
// holds inside five minutes are all settled by playing it and at the crit.
//
// The one this file exists for is the promise the whole game rests on:
// a marked tile is drawn once, never moves, and wounds Theseus if and only if
// he is standing on it when it goes off.

import { describe, expect, it } from "vitest";
import { Engine, GODS } from "../src/engine.ts";
import { BLESSING_AFTER, CHAMBER_COUNT } from "../src/rooms.ts";
import type { Enemy, EnemyKind } from "../src/types.ts";

/** A bare walled room, so a rule can be tested without a chamber's furniture. */
function arena(): Engine {
  const e = new Engine();
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
  e.blessings = [];
  e.aegis = false;
  e.aresCharged = false;
  e.wingedSteps = 0;
  e.player.pos = { x: 4, y: 4 };
  e.player.hearts = 3;
  return e;
}

let ids = 100;
function foe(kind: EnemyKind, x: number, y: number, hp = 2): Enemy {
  return { id: ++ids, kind, pos: { x, y }, hp, maxHp: hp, stunned: 0 };
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
    // A mistyped key must not hand the labyrinth a free turn --- otherwise
    // experimenting with the controls, which is the whole opening, punishes.
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
  /** One guard next to Theseus, and a mark already down on the tile he is on. */
  function marked(): { e: Engine; guard: Enemy } {
    const e = arena();
    const guard = foe("skeleton", 5, 4);
    e.enemies = [guard];
    e.telegraphs = [
      { ownerId: guard.id, tiles: [{ x: 4, y: 4 }], kind: "slash", dir: { x: -1, y: 0 } },
    ];
    return { e, guard };
  }

  it("does not move when Theseus does", () => {
    const { e } = marked();

    const events = e.input("left"); // away to (3,4)

    const lash = events.find((x) => x.t === "lash");
    // The tile that was drawn is the tile that is struck. Nothing re-aims at
    // where he went, which is the only reason a red tile can be trusted.
    expect(lash).toMatchObject({ tiles: [{ x: 4, y: 4 }], hit: false });
    expect(e.player.pos).toEqual({ x: 3, y: 4 });
    expect(e.player.hearts).toBe(3);
  });

  it("wounds Theseus if he is still on it when it goes off", () => {
    const { e, guard } = marked();

    // He answers the guard rather than stepping away, so he never leaves.
    const events = e.input("right");

    expect(guard.hp).toBe(1);
    expect(events.find((x) => x.t === "lash")).toMatchObject({ hit: true });
    expect(e.player.hearts).toBe(2);
  });

  it("still goes off when the foe that drew it survives the blow", () => {
    // The trade the game is built on: stand and strike and take the hit, or
    // step off and give up the tempo. A red tile is never cancelled by
    // wounding its owner, or it would stop predicting anything.
    const { e, guard } = marked();

    e.input("right");

    expect(guard.hp).toBe(1);
    expect(e.player.hearts).toBe(2);
  });

  it("comes off the floor with the foe that drew it", () => {
    const e = arena();
    const guard = foe("skeleton", 5, 4, 1); // one wound and it falls
    e.enemies = [guard];
    e.telegraphs = [
      { ownerId: guard.id, tiles: [{ x: 4, y: 4 }], kind: "slash", dir: { x: -1, y: 0 } },
    ];

    e.input("right");

    expect(e.enemies).toHaveLength(0);
    expect(e.telegraphs).toHaveLength(0);
    expect(e.player.hearts).toBe(3);
  });

  it("is not advanced by a press into a wall", () => {
    const e = arena();
    e.player.pos = { x: 1, y: 4 };
    const guard = foe("medusa", 5, 4);
    e.enemies = [guard];
    e.telegraphs = [
      { ownerId: guard.id, tiles: [{ x: 1, y: 4 }], kind: "beam", dir: { x: -1, y: 0 } },
    ];

    e.input("left"); // into the outer wall

    expect(e.telegraphs).toHaveLength(1); // still pending, still on (1,4)
    expect(e.player.hearts).toBe(3);
  });
});

describe("the opening chamber", () => {
  it("kills its guard on the first blow and opens the gate at once", () => {
    const e = new Engine();
    expect(e.enemies).toHaveLength(1);
    expect(e.enemies[0]!.maxHp).toBe(1);
    expect(e.exitOpen).toBe(false);

    e.input("up"); // one step, so the chevron means something
    const strike = e.input("up"); // and this one lands

    expect(e.enemies).toHaveLength(0);
    expect(strike.some((x) => x.t === "attack" && x.killed)).toBe(true);
    expect(e.exitOpen).toBe(true);
    // Nothing in the first chamber may take a heart. It has one thing to teach.
    expect(e.player.hearts).toBe(3);
  });
});

describe("the gods", () => {
  it("promise exactly three things, and no maybes", () => {
    expect(GODS.map((g) => g.effect)).toEqual([
      "After a kill, your next strike deals +1.",
      "Every fourth move travels two tiles.",
      "Block the next wound.",
    ]);
  });

  it("Ares sharpens the strike after a kill, once", () => {
    const e = arena();
    e.blessings = ["ares"];
    const first = foe("skeleton", 5, 4, 1);
    const stout = foe("skeleton", 4, 3, 3); // survives the sharpened blow
    e.enemies = [first, stout];

    e.input("right"); // kills the first, banks the blow
    expect(e.aresCharged).toBe(true);

    const sharpened = e.input("up");
    expect(sharpened.some((x) => x.t === "attack" && x.damage === 2)).toBe(true);
    expect(stout.hp).toBe(1);
    expect(e.aresCharged).toBe(false); // spent by the strike, not carried on
  });

  it("Hermes carries every fourth move two tiles, and only the fourth", () => {
    const e = arena();
    e.blessings = ["hermes"];
    e.player.pos = { x: 4, y: 6 };

    e.input("up");
    e.input("up");
    e.input("up");
    expect(e.player.pos).toEqual({ x: 4, y: 3 }); // three moves, three tiles

    e.input("up");
    expect(e.player.pos).toEqual({ x: 4, y: 1 }); // the fourth carries two
  });

  it("Athena turns exactly one wound", () => {
    const e = arena();
    e.blessings = ["athena"];
    e.aegis = true;
    const guard = foe("skeleton", 5, 4, 4); // stout enough to swing twice
    e.enemies = [guard];

    e.telegraphs = [
      { ownerId: guard.id, tiles: [{ x: 4, y: 4 }], kind: "slash", dir: { x: -1, y: 0 } },
    ];
    e.input("right");
    expect(e.player.hearts).toBe(3);
    expect(e.aegis).toBe(false);

    e.telegraphs = [
      { ownerId: guard.id, tiles: [{ x: 4, y: 4 }], kind: "slash", dir: { x: -1, y: 0 } },
    ];
    e.input("right");
    expect(e.player.hearts).toBe(2);
  });
});

describe("the Minotaur", () => {
  /**
   * Theseus one step off the bull's row, so a press to the right puts him in
   * the line --- which is what makes the bull commit to a charge.
   */
  function bullring(): { e: Engine; minotaur: Enemy } {
    const e = arena();
    e.bossRoom = true;
    e.player.pos = { x: 6, y: 4 };
    const minotaur = foe("minotaur", 2, 4, 4);
    e.enemies = [minotaur];
    return { e, minotaur };
  }

  it("turns a blade until a charge leaves it reeling", () => {
    const { e, minotaur } = bullring();
    e.player.pos = { x: 3, y: 4 };

    const clang = e.input("left");
    expect(minotaur.hp).toBe(minotaur.maxHp);
    expect(clang.some((x) => x.t === "clang")).toBe(true);

    e.telegraphs = [];
    minotaur.stunned = 2;
    e.input("left");
    expect(minotaur.hp).toBe(minotaur.maxHp - 1);
  });

  it("marks the whole run of the row, wall to wall", () => {
    const { e } = bullring();

    e.input("right"); // now they share row 4, and the bull commits

    expect(e.telegraphs).toHaveLength(1);
    // Not merely as far as Theseus: the mark is the line it will actually run.
    expect(e.telegraphs[0]!.tiles.map((t) => t.x)).toEqual([3, 4, 5, 6, 7]);
    expect(e.telegraphs[0]!.kind).toBe("charge");
  });

  it("crashes and can be cut when Theseus steps out of the line", () => {
    const { e, minotaur } = bullring();

    e.input("right"); // the bull marks row 4; Theseus stands on it at (7,4)
    e.input("up"); // ... and steps out of it, to (7,3)

    expect(minotaur.stunned).toBeGreaterThan(0);
    expect(e.player.hearts).toBe(3);

    // The window is real: the very next press lands.
    e.player.pos = { x: minotaur.pos.x, y: minotaur.pos.y - 1 };
    e.input("down");
    expect(minotaur.hp).toBe(minotaur.maxHp - 1);
  });

  it("does not crash --- and so gives no window --- when it runs Theseus down", () => {
    const { e, minotaur } = bullring();

    e.input("right"); // marked: the whole of row 4, and he is standing in it
    e.input("left"); // still in it, at (6,4)

    expect(e.player.hearts).toBe(2);
    expect(minotaur.stunned).toBe(0);
  });
});

describe("the labyrinth", () => {
  it("is five chambers, with favour offered after the first and the third", () => {
    expect(CHAMBER_COUNT).toBe(5);
    expect([...BLESSING_AFTER].sort()).toEqual([0, 2]);
  });
});
