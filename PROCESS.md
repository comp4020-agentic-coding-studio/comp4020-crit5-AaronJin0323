# Process overview

**LABYRINTH: Favour of the Gods** — five chambers, three hearts, one rule:
moving into an enemy attacks it, so every step is also a choice of position. No
instructions anywhere.

## The suite was green and the game could not be won

Thirty tests passed on a build whose Minotaur could not be beaten: his stun was
decremented twice per cycle, so correct play bought one blow per charge. Every rule was right; only their sum was broken. So I wrote a
bot that plays whole runs — 300 seeds, 3% wins — and logged which telegraph
caused each wound. Every point of damage was the boss's, not the enemies I had
assumed. 181/300 after. It is `pnpm balance` now, deliberately outside
`check`: a number to read, not a threshold to enforce.

[`a574b7c`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-AaronJin0323/commit/a574b7c) · [`832e053`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-AaronJin0323/commit/832e053)

## The changes that came from playing, not reading

Two defects no assertion could reach. The loss screen rendered in celebratory
gold — the stylesheet dressed `[data-ended="lost"]`, the renderer writes
`"loss"`. And the opening chamber cost a heart every run, which I first fixed
by letting a landed blow cancel its target's wind-up. That was the wrong rule:
the game's one promise is that a red tile is struck after your next move, and I
had attached an exception no player could read off the board. The improvement
pass reversed it and made the opening safe by composition instead — one guard
that never moves and never marks.

Both are now held by tests of the agreement underneath, each reverted to red
before I trusted it.

[`540d084`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-AaronJin0323/commit/540d084) · [`71fc052`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-AaronJin0323/commit/71fc052) · [`5adb68f`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-AaronJin0323/commit/5adb68f)

![The same loss screen twice: celebratory gold above, blood red below](docs/loss-verdict.png)

## Directing it

One line of the brief did most of the tuning — *forgiving rather than punishing;
precision timing should not be required* — so a wave never fields two gorgons,
and crossing a threshold restores a heart.
