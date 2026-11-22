## Purpose

Identify music playing nearby and revisit recent matches.

## Pick

Identify an unknown song from ambient sound or humming through the microphone. Not playing a known recording (Player), typing a music search (Search), or checking pronunciation (SpeechCheck).

## Writer

- Use style "listen" for recognition first, or "result" to foreground the identified track when available. Recognition happens after permission; never write a listening flag, result, or URL to pretend recognition already happened.
- An artwork-free view must write "media":"none" (not null, even with no matches yet), so future results and history also hide covers.
