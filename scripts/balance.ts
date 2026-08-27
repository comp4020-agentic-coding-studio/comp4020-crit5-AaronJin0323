// A competent-but-not-brilliant player, run over many seeds. Answers the two
// questions a screenshot can't: is a run winnable, and is it about the right
// length. `pnpm balance` runs it.
//
// Deliberately not part of `pnpm check`. It measures rather than asserts ---
// there is no win rate that is "correct", only one you look at and decide
// about --- and a bot is a *ceiling*: it dodges perfectly and never misreads a
// mark, so a first-time player sits well below whatever it scores.

import { Engine } from "../src/engine.ts";
import { DIRS, type Dir, type Vec, add, eq, key } from "../src/types.ts";

const ORDER: Dir[] = ["up", "right", "down", "left"];

function walkable(g: Engine, v: Vec): boolean {
  return g.inBounds(v) && !g.isWall(v);
}

/** First step of a shortest path to `goal`, avoiding `avoid` tiles if it can. */
function stepToward(g: Engine, goal: Vec, avoid: Set<string>): Dir | null {
  for (const strict of [true, false]) {
    const seen = new Set([key(g.player.pos)]);
    const queue: { at: Vec; first: Dir }[] = [];
    for (const d of ORDER) {
      const t = add(g.player.pos, DIRS[d]);
      if (!walkable(g, t) || seen.has(key(t))) continue;
      if (strict && avoid.has(key(t))) continue;
      seen.add(key(t));
      queue.push({ at: t, first: d });
    }
    while (queue.length) {
      const node = queue.shift()!;
      if (eq(node.at, goal)) return node.first;
      if (g.enemyAt(node.at)) continue; // bodies block the corridor
      for (const d of ORDER) {
        const t = add(node.at, DIRS[d]);
        if (!walkable(g, t) || seen.has(key(t))) continue;
        if (strict && avoid.has(key(t))) continue;
        seen.add(key(t));
        queue.push({ at: t, first: node.first });
      }
    }
  }
  return null;
}

export function decide(g: Engine): Dir | null {
  const danger = new Set(g.dangerTiles().map(key));

  const hittable = ORDER.filter((d) => {
    const foe = g.enemyAt(add(g.player.pos, DIRS[d]));
    return foe && !(foe.kind === "minotaur" && foe.stunned === 0);
  });

  if (danger.has(key(g.player.pos))) {
    // One mark, and its owner is in reach: turn on it rather than retreat.
    const marking = new Set(
      g.telegraphs.filter((t) => t.tiles.some((v) => eq(v, g.player.pos))).map((t) => t.ownerId),
    );
    const interrupt = hittable.find((d) => marking.has(g.enemyAt(add(g.player.pos, DIRS[d]))!.id));
    if (interrupt && marking.size === 1) return interrupt;

    const escape = ORDER.find((d) => {
      const t = add(g.player.pos, DIRS[d]);
      return walkable(g, t) && !g.enemyAt(t) && !danger.has(key(t));
    });
    if (escape) return escape;
  }

  if (hittable.length) return hittable[0]!;

  if (g.exitOpen && g.exit) return stepToward(g, g.exit, danger);

  // A bull that isn't reeling can only be answered by not being in front of it:
  // break the row or column and let it charge past.
  const bull = g.enemies.find((e) => e.kind === "minotaur" && e.stunned === 0);
  if (bull && g.enemies.length === 1) {
    const lined = (v: Vec) => v.x === bull.pos.x || v.y === bull.pos.y;
    if (lined(g.player.pos)) {
      const sidestep = ORDER.find((d) => {
        const t = add(g.player.pos, DIRS[d]);
        return walkable(g, t) && !g.enemyAt(t) && !danger.has(key(t)) && !lined(t);
      });
      if (sidestep) return sidestep;
    }
  }

  // Nearest *reachable*, not nearest: a chamber's middle band is only enterable
  // at its two ends, so the closest foe is often behind another one.
  const byRange = [...g.enemies].sort(
    (a, b) =>
      Math.abs(a.pos.x - g.player.pos.x) + Math.abs(a.pos.y - g.player.pos.y) -
      (Math.abs(b.pos.x - g.player.pos.x) + Math.abs(b.pos.y - g.player.pos.y)),
  );
  for (const e of byRange) {
    const dir = stepToward(g, e.pos, danger);
    if (dir) return dir;
  }
  return null;
}

// Importable for the bot alone --- `blame.ts` and friends reuse `decide()`
// without wanting the report.
if (import.meta.main) {
  const RUNS = Number(process.argv[2] ?? 200);
  const tally = { won: 0, lost: 0, stuck: 0 };
  const turns: number[] = [];
  const deathChamber: number[] = [];

  for (let seed = 1; seed <= RUNS; seed++) {
    const g = new Engine(seed);
    let t = 0;
    while (g.phase !== "won" && g.phase !== "lost" && t < 600) {
      if (g.phase === "blessing") {
        g.choose(g.offer[seed % g.offer.length]!.id);
        continue;
      }
      const dir = decide(g);
      if (!dir) break;
      g.input(dir);
      t++;
    }
    if (g.phase === "won") {
      tally.won++;
      turns.push(t);
    } else if (g.phase === "lost") {
      tally.lost++;
      deathChamber.push(g.chamber);
      turns.push(t);
    } else {
      tally.stuck++;
    }
  }

  const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
  const counts = new Map<number, number>();
  for (const c of deathChamber) counts.set(c, (counts.get(c) ?? 0) + 1);

  console.log(`${RUNS} runs`);
  console.log(`  won   ${tally.won}`);
  console.log(`  lost  ${tally.lost}`);
  console.log(`  stuck ${tally.stuck}`);
  console.log(`  turns: median ${median(turns)}, max ${Math.max(...turns)}`);
  console.log(`  died in chamber: ${[...counts].sort().map(([c, n]) => `${c}:${n}`).join("  ")}`);
}
