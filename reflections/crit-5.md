# Crit 5 — A game

**The breakthrough** was not being satisfied with the first version, and then
working out how to say why.

The first build of *Labyrinth* was finished by every measure I had: tests green,
deployed, playable start to finish. It still was not good. I could not tell a
landed hit from an ignored keypress, the red tiles did not reliably mean
anything, and the emoji artwork left the Greek theme decorative. None of it was
a bug, so none of my checks could see it.

What moved the work was writing that down as a diagnosis rather than a
complaint. Not "make it better", but one named failure and one specified rule at
a time: a red tile always means *that exact tile will be attacked after your
next valid move*, and the first enemy has one hit point so the first bump
teaches the whole combat system. I was as explicit about what not to do — no
RPG, keep the five chambers, keep a run under five minutes — because the easiest
way to lose a working prototype is to let an agent grow it.

**What it changed about who I want to be** is that I no longer think the code is
my contribution. An agent writes it, and this week it wrote something that
passed every check I had and was still not worth showing anyone. What is left
for me is harder to see: deciding the thing is not good enough, and being able
to say why precisely enough to act on. I want to be the developer who holds the
standard rather than the one who types — who plays the build, takes the
discomfort seriously, and turns it into a specification. And who keeps the two
things that cannot be handed off: the judgement about whether the work is good,
and the account of how it was made.
