// A competent-but-not-brilliant player, run many times. Answers the two
// questions a screenshot can't: is a run winnable, and is it about the right
// length. `pnpm balance` runs it.
//
// The labyrinth itself is fixed --- same five chambers, same populations,
// every run --- so the thing being sampled here is the *player*, not the
// level. Each run shuffles which direction the bot prefers when several are
// equally good, and which gifts it takes, so the spread across runs is the
// spread across ways of playing the same gauntlet.
//
// Deliberately not part of `pnpm check`. It measures rather than asserts ---
// there is no win rate that is "correct", only one you look at and decide
// about --- and a bot is a *ceiling*: it dodges perfectly and never misreads a
// mark, so a first-time player sits well below whatever it scores.

import { Engine } from "../src/engine.ts";
import { mulberry32 } from "../src/rng.ts";
import { DIRS, type Dir, type Vec, add, eq, key } from "../src/types.ts";

function walkable(g: Engine, v: Vec): boolean {
  return g.inBounds(v) && !g.isWall(v);
}

/** First step of a shortest path to `goal`, avoiding `avoid` tiles if it can. */
function stepToward(g: Engine, goal: Vec, avoid: Set<string>, ORDER: Dir[]): Dir | null {
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

export function decide(g: Engine, ORDER: Dir[] = ["up", "right", "down", "left"]): Dir | null {
  const danger: Set<string> = new Set(g.markedTiles().map(key));

  const hittable = ORDER.filter((d) => {
    const foe = g.enemyAt(add(g.player.pos, DIRS[d]));
    return foe && !(foe.kind === "minotaur" && foe.stunned === 0);
  });

  // Standing on a mark. Since a blow no longer cancels one, the only answer
  // is to not be here --- which is the whole lesson the red tile teaches.
  if (danger.has(key(g.player.pos))) {
    const escape = ORDER.find((d) => {
      const t = add(g.player.pos, DIRS[d]);
      return walkable(g, t) && !g.enemyAt(t) && !danger.has(key(t));
    });
    if (escape) return escape;
    // Cornered: trade the heart for the blow rather than for nothing.
    if (hittable.length) return hittable[0]!;
  }

  if (hittable.length) return hittable[0]!;

  if (g.exitOpen && g.exit) return stepToward(g, g.exit, danger, ORDER);

  // Note there is no "keep away from the bull" rule here, and there must not
  // be: standing in his line is how you make him commit, and the mark he
  // draws is handled by the escape above. A bot that refuses the bait never
  // sees him crash, and so can never wound him at all.
  //
  // Nearest *reachable*, not nearest: a chamber's middle band is only enterable
  // at its two ends, so the closest foe is often behind another one.
  const byRange = [...g.enemies].sort(
    (a, b) =>
      Math.abs(a.pos.x - g.player.pos.x) + Math.abs(a.pos.y - g.player.pos.y) -
      (Math.abs(b.pos.x - g.player.pos.x) + Math.abs(b.pos.y - g.player.pos.y)),
  );
  for (const e of byRange) {
    const dir = stepToward(g, e.pos, danger, ORDER);
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
    const rng = mulberry32(seed);
    // A different set of habits each run: which way this player leans when
    // two moves are equally good, and which gods they favour.
    const order: Dir[] = ["up", "right", "down", "left"]
      .map((d) => ({ d: d as Dir, r: rng() }))
      .sort((a, b) => a.r - b.r)
      .map((x) => x.d);

    const g = new Engine();
    let t = 0;
    while (g.phase !== "won" && g.phase !== "lost" && t < 600) {
      if (g.phase === "blessing") {
        g.choose(g.offer[Math.floor(rng() * g.offer.length)]!.id);
        continue;
      }
      const dir = decide(g, order);
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
