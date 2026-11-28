<!-- replay-literals: d d mcdds -->

## Purpose

Recall an answer, reveal it and rate how well you remembered it.

## Pick

Recall from a prompt, flip to reveal its answer, then rate recall to schedule the next review. Not checked answers (Quiz) or swiping to keep or skip things (SwipeStack).

## Writer

- Write only seed cards. Do not write cards left, flipped state or review dates.
- Use null for unrequested settings. A full-width photo sets only media to "cover".
- Use style "binary" for just Know and Still learning; otherwise write style null for the four ratings (srs). Put a supplied recording in audio on that card only; audio does not request a photo or a media variant.
- For a generated image, use `step_illustration` or `item` or `plant` or `pet` or `place` in `photo`. Use only when a picture helps recognize the card subject; it must not reveal an answer the user is still recalling. Keep any supplied reference. In an image slot, use a short plain noun phrase from the app’s world for `subject`; no style, camera, palette or layout words.
