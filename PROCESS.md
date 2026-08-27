# Process overview

**LABYRINTH: Favour of the Gods** — five chambers, three hearts, one rule:
moving into an enemy is how you attack, so every step is also a decision about
position. No instructions anywhere.

## The moments that mattered

### The suite was green and the game could not be won

Thirty tests passed on a build whose Minotaur could not be beaten: its stun was
decremented again by the following enemy turn, so correct play bought one blow
per charge against five hit points. Every rule was right; only their sum was
broken. So I wrote a bot that plays whole runs — 300 seeds, 3% wins — and logged
which telegraph caused each wound: the blame was the boss's, not the enemies I
had assumed. 181/300 after. It is `pnpm balance` now, deliberately not part of
`check`: a number to read, not a threshold to enforce.

[`a574b7c`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-AaronJin0323/commit/a574b7c)
· [`832e053`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-AaronJin0323/commit/832e053)

### The change that came from playing — spec line 5

The opening chamber cost me a heart every single run. A skeleton beside Theseus
marks the tile he is on, so attacking it always ate the hit and retreating meant
never attacking: the chamber that teaches what the sword does charged a third of
a life for the lesson. A landed blow now interrupts its
target's wind-up. The existing test *encoded* the bug, so its arena had to grow
a second guard.

[`71fc052`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-AaronJin0323/commit/71fc052)

### Gold is the wrong colour for dying

"THE LABYRINTH CLAIMS ANOTHER HERO" rendered in celebratory gold: the stylesheet
dressed `[data-ended="lost"]`, the renderer writes `"loss"`. Reading a
screenshot found it; nothing else could. The guard I added doesn't test the
colour but the agreement underneath — every `data-ended` value the CSS selects
must be one the renderer writes — and I reverted the selector to watch it fail
before trusting it.

[`540d084`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-AaronJin0323/commit/540d084)

![The same loss screen twice: celebratory gold above, blood red below](docs/loss-verdict.png)

## Directing it

One line of the brief did most of the tuning:

> forgiving rather than punishing — precision timing should not be required

So a wave never fields two gorgons — their line-marks cover your tile and all four
neighbours, which is damage with no answer — and crossing a
threshold restores a heart.
