<!-- replay-literals: d d mcdssds -->

## Purpose

Practise one question at a time and get feedback after checking each answer.

## Pick

Assessed practice questions with correct answers and immediate feedback. Use for multiple choice, true or false, typed recall, matching pairs or putting words in sentence order. Not choosing a preference (Choice), a vote (Poll), or self-rated recall (Flashcard).

## Writer

- Use null for unused fields. For choice, write 2–5 options and a zero-based answer index. For truefalse, write a boolean answer. For type, write a text answer. For match, write 3–5 correct left/right pairs and set answer to null.
- For kind "order", put 3–8 scrambled word tiles in words, and write answer as the complete list of their zero-based indexes in correct sentence order. For example, words ["fern", "the", "Water"] have answer [2, 1, 0]. Set options and pairs to null.
- Use media inside a question only for its supplied audio clip reference. Component-level media controls question photos, not audio.
- Leave selected_option, selected_left and selected_right null; selections are made by the learner.
- When asked to hide the question photo, write media "none" and retain its photo reference. Always write density and surface as null unless requested; do not fill in defaults such as "comfortable" or "card". Use media null for unrequested media.
