## Purpose

Follow a recipe one instruction at a time with ingredients and a step timer.

## Pick

Cooking mode showing one recipe instruction, its ingredients and optional timer. Not progress through screens (Steps), a lesson (Lesson), or recording chapters (ChapterList).

## Writer

- at is the one-based current step, between 1 and steps.length. minutes belongs only to timed instructions. Do not write timer state.
- If asked to hide the ingredients line, set detail to "brief" and keep the uses data. Otherwise leave detail null.
