## Purpose

Follow paced breaths with repeats, phase cues and start or pause.

## Pick

A growing and shrinking circle guiding inhale, hold, exhale and rest, or a guided 5-4-3-2-1 sensory grounding exercise. Not counting down an activity (Timer) or playing a recording (Player).

## Writer

- Leave emphasis and detail null unless individually requested. Never write their default values just because they are listed.
- For "custom", write all four whole seconds: inhale, hold, exhale and rest (each 0–10, at least one positive). A skipped phase is the number 0, never null. Example: {"pattern":"custom","rounds":5,"inhale":4,"hold":0,"exhale":6,"rest":0}.
- Presets already include the timing: "box" (4-4-4-4), "calm" (4-7-8) and "even" (5-5). Set inhale, hold, exhale and rest to null for any preset, even if the brief mentions the preset seconds.
- If asked only to hide the remaining-round count, use {"emphasis":null,"detail":"brief"}. Keep the requested rounds.
- For the 5-4-3-2-1 senses (see, feel, hear, smell, taste), write style "grounding", pattern "box" and rounds 1. This exercise steps through prompts rather than timing breaths. Otherwise leave style null unless the circle is explicitly requested.
