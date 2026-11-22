<!-- replay-literals: d d mcss -->

## Purpose

Practise saying a phrase aloud and see which words need another try.

## Pick

Practise saying an exact target phrase into a microphone and get per-word pronunciation feedback and a fluency score. Not passive playback (Player), tap-or-type tests (Quiz), or open-ended chat (AiThread).

## Writer

- Supply the target phrase and its spoken words in order. Leave word status and fluencyScore null until a real evaluation returns results. Use referenceAudio only for the supplied clip reference, not a URL.
- Use style "listen" when the learner hears a reference before seeing the phrase; supply referenceAudio. If the user wants the target visible but optional phonetic and translation hints hidden, use detail "brief" and retain both hints in props.
