# COMP4020 prototype

Your starter repo for a COMP4020 prototype: a static site in HTML/CSS/TypeScript
that builds to plain HTML/CSS/JS and deploys to GitHub Pages. The deployed site
is what gets marked, not this repo.

The
[course website](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/)
publishes this deliverable's brief and spec, and this repo's name tells you
which deliverable applies. Read both before you plan or build.

## How to work in here

- Keep the dev server running (`pnpm dev`) so you see changes as you make them.
- Run `pnpm check` before you push.
- Open the page in a browser and look at it. The rendered page is the truth;
  your mental model of it isn't.
- When a check fails, read its output before you change anything.
- Never commit a red state.

## The link-preview card

`public/card.png` (1200x630) is the image a shared link shows; `index.html`'s
head points at it. Replace it and the `description` meta, and copy the head
block into any new page. The card URL resolves against the page that names it,
like any link --- `./card.png` is wrong one directory down, and nothing in CI
checks it, so the deployed head is the only place a broken one shows up.

## The checks

`pnpm check` runs them, and `pnpm check:evidence` is the extra gate before you
ship. CI runs the same plus links, secrets and the deploy.

`spec/README.md`, `PROCESS.md` and `reflections/README.md` are in this repo and
say what they are for.

## Things this stack keeps getting wrong

Carried forward from previous weeks --- general lessons about this template's
tooling, not tied to any one prototype's content. (This template no longer
ships stylelint/oxlint --- `pnpm check` is just typecheck, build, and vitest ---
so the old lint-specific notes were dropped along with it.)

- **axe reports contrast over a gradient as "incomplete", not "pass".** Don't
  read a low/zero violation count as real coverage; measure the rendered pixel
  directly when the background isn't flat.
- `agent-browser`'s `is visible` is an in-viewport check, not a
  `display`/`visibility` check --- a perfectly visible element below the fold
  reads as `false`. Assert on `getComputedStyle(...).display` via `eval`
  instead.
- `agent-browser batch` takes an array of *arg arrays* on stdin
  (`["set","viewport","1920","1080"]`, not `"set viewport 1920 1080"`), and
  there's no `--file` flag --- generate the JSON and pipe it.
- **Reusing a port serves the browser a stale page.** Append a
  `?v=<timestamp>` cache-buster to the URL, or a previous run on that port will
  happily confirm a version of the page you deleted.
- **`[].every()` is `true`, so a probe over an empty list is a false pass.**
  Any "all of them are fine" assertion has to assert a non-zero count first
  (`items.length > 0 && …`).
- **A CSS `transform` overrides an SVG `transform` attribute on the same
  element** --- it doesn't compose with it. Put a static transform on an outer
  `<g>` and animate a child inside it instead.
- **A flex `flex-basis` is a width in a row layout and a height once a media
  query stacks it into a column.** Reset it to `flex: 0 0 auto` in the stacked
  layout rather than letting the row value leak through.
- **A sticky bar above a `100svh` hero overflows the first screen by exactly
  the bar's height.** Hold the bar height in one custom property and use it
  both to shrink the hero (`calc(100svh - var(--nav-h))`) and to offset anchor
  targets (`scroll-margin-top`), so overriding it once at a breakpoint updates
  every use.
- **Measure the phone fold; don't reason about it.** Check where a control and
  the thing it changes actually land at 390x844 before redesigning around a
  problem that measuring might show doesn't exist.
- **`transform: scale(var(--x))` transitions fine with an *unregistered*
  custom property** --- the transition is declared on `transform`, and `var()`
  is substituted at computed-value time. `@property` is only needed to
  transition the custom property itself.
- **Gradients don't interpolate.** A transition can't animate
  `background-image`; crossfade stacked layers on `opacity` instead.
- **Position and size have to live on separate elements when scaling
  something.** `translate()` then `scale()` on one element means the *size*
  decides where it lands. Split into a positioning wrapper and a scaling
  child.
- **A dimension in `vw` with an offset in `vh` (or vice versa) needs a
  separate override per viewport shape** --- it can't be derived once and
  reused, because the two units don't track each other across aspect ratios.
- **A fully green browser suite says nothing about whether the page looks
  right.** A 38-check Playwright run passed while the layout had a dead
  vertical third, hollow buttons, and a glyph rendering as a blob. Assertions
  cover behaviour; only reading the screenshot covers design. Budget a look at
  the image as a separate step, not as a formality after the checks pass.
- **You cannot judge small artwork in a full-page screenshot.** An SVG icon is
  ~50px inside a downscaled 1920px capture — enough to see that something is
  there, not enough to see what it is. Screenshot the *element* with
  `deviceScaleFactor: 4` (and `reducedMotion: "reduce"`, or an opacity
  animation captures mid-fade) when the detail is the thing being checked.
  **And budget several rounds, not one:** each correction changes what the
  silhouette reads as next, so a small figure typically takes three or four
  look-fix cycles before it stops reading as the wrong object.
- **`visibility: hidden` takes an element out of hit-testing**, so a harness
  that hides the page before capturing it can't also click a control hidden
  that way. Interact first, then hide, then capture --- and hash output files
  before trusting a sweep that looks suspiciously uniform.
- **A suite of rules can be green while the rules add up to something
  impossible.** Every test passed on a build whose boss fight could not be
  finished by playing it correctly: each rule was right, and their sum was
  unwinnable. When the artefact has a success condition --- a game to win, a
  flow to complete, a form to get to the end of --- write a bot that attempts
  the whole thing over many random seeds and *measure* it. Assertions cover
  rules; only an end-to-end attempt covers whether the rules compose. Keep it
  out of `check`: it produces a number to read, not a threshold to enforce, and
  a bot is a ceiling rather than a typical user.
- **Attribute a symptom before tuning anything.** The instinct was that the
  enemies were too strong; logging which specific source caused each point of
  damage put every one of them on the boss. One diagnostic pass beat three
  rounds of guessing at numbers.
- **Two files agreeing on a string is a fact a test can hold, even when the
  thing it controls isn't testable.** A stylesheet selecting `[x="lost"]` and
  the code writing `"loss"` is a bug no assertion about colour could ever
  catch --- but "every value the CSS selects is a value the code writes" is
  mechanical. Same shape for routes and links, or a data attribute and its
  consumer. When the visible symptom is out of reach, test the agreement
  underneath it.
- **A regression test written after the fix has never been seen to fail.**
  Reintroduce the bug, watch it go red, then restore. Otherwise you have
  shipped a test that asserts something true for reasons you haven't checked.
- **`toContain` on a string is a substring check, and it makes a regression
  test toothless.** Asserting that a stylesheet "contains" a keyframe name
  passes on a bare mention of it in a comment, or in an unrelated selector.
  Assert the *shape* you actually care about ---
  `new RegExp('@keyframes\\s+name\\s*\\{')` --- and prove it fails both ways.
- **Two single-class CSS rules have equal specificity, so the later one wins
  silently.** A `.fig` sizing rule written for one context, six hundred lines
  below `.fig-heart`, quietly resized every heart in the HUD. When a class is
  meant for one context, scope it to that context (`.actor .fig`) rather than
  relying on where it happens to sit in the file.
- **A state-modifier class that shares a name with a component inherits the
  component's layout.** A list item toggled to `.boss` picked up the boss health
  bar's `position: absolute` and left the page --- the row silently showed four
  of five. Namespace modifiers (`.is-boss`), and hold it mechanically: every
  class the code toggles, checked against the bare component selectors in the
  stylesheet. Same family as the string-agreement test above.
- **A re-export nothing imports is dead weight, and its comment is often
  wrong.** Two here claimed to exist for a consumer that imports from somewhere
  else entirely. Grep the symbol before believing the comment justifying it.
- **A fix can remove the symptom by adding an exception the user cannot see.**
  Cancelling an enemy's telegraph when you wound it stopped the unfair damage
  and quietly broke the one rule the design rested on --- the red tile no longer
  reliably predicted anything. Ask of any rule change: *can the person using
  this read it off the screen?* If not, fix the composition instead of the rule.

## Shell

- **zsh does not word-split unquoted parameter expansions.** `set -- $CFG` and
  `for x in $LIST` silently see one word, so a sweep written the bash way runs
  once with a corrupted argument instead of failing. Use a zsh array
  (`arr=(${=CFG})`) or drive the loop from `python3`/a heredoc.

## Working style

- **A re-theme is CSS-only, not a rewrite.** When asked to restyle or re-theme
  a page, change presentation (styles, and only the markup needed to carry new
  classes/structure) and leave existing body text --- paragraphs, headings,
  labels --- exactly as written. Don't rephrase prose to "fit" a new theme's
  voice, and don't add new decorative copy unless asked. If a style genuinely
  can't be expressed without a structural change, raise that as a separate
  call-out rather than folding a silent content edit into the restyle.

## This file is yours

A starting point, not a rulebook: what you add to it is the harness, and the
harness is assessed. This file and the sensors you wire into `check` carry
across the course --- both come with you into next week's repo. The prototype
doesn't: source, and the tests answering this week's published spec, stay
behind. `spec/README.md` draws the line.
