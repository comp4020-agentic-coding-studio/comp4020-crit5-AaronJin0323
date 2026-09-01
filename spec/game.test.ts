import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

// Turns the mechanically-checkable lines of C5's published spec
// (https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/crits/05-game/)
// into tests against the built site. Whether a stranger reaches an ending in
// five minutes, whether the game actually teaches itself once you're past the
// opening screen, and whether one change came from playing rather than
// reading code, are judged at the crit, not here.

const distPath = resolve("dist/index.html");

describe("a game", () => {
  it("built the page", () => {
    expect(existsSync(distPath), `${distPath} not found — run pnpm build first`).toBe(true);
  });

  const doc = new JSDOM(readFileSync(distPath, "utf8")).window.document;

  it("marks the opening invitation to the first move", () => {
    // "the opening screen invites the first move" --- [data-start] is the
    // contract. The invitation is deliberately wordless (the brief forbids
    // instructions anywhere), so what has to hold is that it carries a real
    // mark rather than an empty box, and that the stylesheet actually makes
    // that mark move --- a still chevron on a still board reads as furniture.
    const start = doc.querySelector("[data-start]");
    expect(start, "no [data-start] element --- see spec/README.md").toBeTruthy();

    const hasMark =
      (start?.textContent?.trim() ?? "") !== "" || (start?.children.length ?? 0) > 0;
    expect(hasMark, "[data-start] is empty --- nothing invites the first move").toBe(true);

    const css = readFileSync(resolve("styles.css"), "utf8");
    const animated = /\.hint[^{]*\{[^}]*animation:\s*([a-z-]+)/i.exec(css);
    expect(animated, "nothing animates the opening invitation").toBeTruthy();
    const name = animated?.[1] ?? "";
    expect(
      new RegExp(`@keyframes\\s+${name}\\s*\\{`).test(css),
      `keyframes ${name} are never declared`,
    ).toBe(true);
  });

  it("reserves where an ending will be marked", () => {
    // "it can be lost: a wrong move is possible, and play ends somewhere ---
    // a win, a loss or a finish." [data-ended] is the contract: the element
    // that will carry the outcome exists from the start; a game rule's own
    // test (spec line 5) is what actually drives it to one of the three.
    const ended = doc.querySelector("[data-ended]");
    expect(ended, "no element carries [data-ended] --- see spec/README.md").toBeTruthy();
    const outcome = ended?.getAttribute("data-ended");
    if (outcome) {
      expect(["win", "loss", "finish"]).toContain(outcome);
    }
  });

  it("has no how-to-play instructions on screen", () => {
    // "no instructions anywhere, on screen or off" --- a modal, dialog or
    // dedicated instructions block would be exactly that.
    expect(doc.querySelector('[data-instructions], dialog, [role="dialog"]')).toBeFalsy();

    const text = doc.body.textContent?.toLowerCase() ?? "";
    for (const phrase of ["how to play", "instructions", "tutorial", "click here to start"]) {
      expect(text.includes(phrase), `page text contains "${phrase}"`).toBe(false);
    }
  });

  it("styles only the endings the renderer can actually write", () => {
    // Found by looking at a screenshot: the loss verdict was meant to be red
    // and came out gold, because the stylesheet said [data-ended="lost"] and
    // the renderer writes "loss". No test could see the colour --- but the two
    // files disagreeing is a fact, and this is that fact.
    const css = readFileSync(resolve("styles.css"), "utf8");
    const view = readFileSync(resolve("src/render.ts"), "utf8");

    const styled = [...css.matchAll(/\[data-ended="([^"]+)"\]/g)].map((m) => m[1]!);
    expect(styled.length, "no [data-ended] rules in styles.css").toBeGreaterThan(0);
    for (const value of styled) {
      expect(
        view.includes(`"${value}"`),
        `styles.css dresses [data-ended="${value}"], which the renderer never writes`,
      ).toBe(true);
    }
  });

  it("gives the chamber markers class names nothing else has claimed", () => {
    // Same species as the bug above, found the same way --- by looking. The
    // fifth marker was `.boss`, which is also the boss health bar's class, and
    // the bar is absolutely positioned: the pip was flung to the top-left
    // corner of the page and the row silently showed four of five. A modifier
    // that shares a name with a component inherits the component's layout.
    const css = readFileSync(resolve("styles.css"), "utf8");
    const view = readFileSync(resolve("src/render.ts"), "utf8");

    const pip = /classList\.toggle\("([a-z-]+)"/g;
    const modifiers = [...view.matchAll(pip)].map((m) => m[1]!);
    expect(modifiers.length, "the renderer toggles no classes at all").toBeGreaterThan(0);

    for (const name of new Set(modifiers)) {
      const bare = new RegExp(`(^|\\}|,)\\s*\\.${name}\\s*\\{`, "m");
      const compound = new RegExp(`\\.[a-z-]+\\s*\\.${name}\\b|\\.${name}\\s*\\.`, "m");
      if (bare.test(css) && !compound.test(css)) continue; // a component in its own right
      expect(
        !bare.test(css),
        `.${name} is both a component in styles.css and a state the renderer toggles`,
      ).toBe(true);
    }
  });

  it("ships no separate instructions page", () => {
    // "no instructions anywhere ... off [screen]" --- no README-as-a-page,
    // no how-to-play route sitting next to the game.
    const files = readdirSync(resolve("dist"));
    const suspicious = files.filter((name) => /instructions|how-?to-?play|tutorial|help/i.test(name));
    expect(suspicious, `found ${suspicious.join(", ")}`).toHaveLength(0);
  });
});
