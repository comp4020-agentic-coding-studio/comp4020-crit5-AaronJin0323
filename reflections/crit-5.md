# Crit 5 — A game

**The breakthrough** was admitting I could not judge this game by looking at it.
I had a green suite and five chambers that rendered handsomely, and I genuinely
did not know whether the thing could be won. Screenshots could not tell me, and
neither could unit tests: every rule was individually correct, and the bug lived
in their sum — a stun counter decremented twice per cycle, which made the
Minotaur unbeatable by anyone playing correctly. Writing a bot that plays 300
whole runs turned an opinion ("feels about right") into a number (3% wins), and
once there was a number I knew both what to fix and when to stop.

The second thing that moved the work was the exact opposite: sitting down and
playing the opening chamber myself, and losing a heart every single time. No
amount of measurement would have found that. The game was working precisely as
written.

**What it changed** is that I had been treating a green suite as the thing that
tells me the work is finished, and this week it was wrong twice over — once
because passing tests hid an unwinnable game, once because a wrong colour was
invisible to any assertion I could write. I would rather be the sort of
developer who asks what class of question each instrument can actually answer,
and then goes and buys the instrument for the rest: a bot for *does this
compose*, my own hands for *is this fair*, my eyes for *does it look like
anything*. Tests are backpressure while I work. They were never the verification
I was treating them as.
