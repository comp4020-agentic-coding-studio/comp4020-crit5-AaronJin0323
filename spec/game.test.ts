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
    // contract: whatever the game turns out to be, something on the opening
    // screen carries this attribute and has real, visible copy.
    const start = doc.querySelector("[data-start]");
    expect(start, "no [data-start] element --- see spec/README.md").toBeTruthy();
    expect(start?.textContent?.trim(), "[data-start] has no visible copy").not.toBe("");
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

  it("ships no separate instructions page", () => {
    // "no instructions anywhere ... off [screen]" --- no README-as-a-page,
    // no how-to-play route sitting next to the game.
    const files = readdirSync(resolve("dist"));
    const suspicious = files.filter((name) => /instructions|how-?to-?play|tutorial|help/i.test(name));
    expect(suspicious, `found ${suspicious.join(", ")}`).toHaveLength(0);
  });
});
