## Purpose

Choose an ordered track or episode and see its playback progress.

## Pick

An ordered queue of separate tracks or episodes, with durations, played progress and download controls. Not ordinary rows (List) or chapter marks within one recording (ChapterList).

## Writer

- Use style "episodes" for dated episodes with a description line in sub, otherwise "tracks" for numbered tracks. If no episode note or date is supplied, set sub to null. The playing index is zero-based; omit it unless one is playing.
- Seconds are whole recording lengths; played is a fraction from zero to one. Each row opens its own player screen.
- Default to "detail":null,"density":null,"surface":null. Only when explicitly asked to hide episode notes, write "detail":"brief"; keep the supplied notes in sub and leave density and surface null unless independently requested.
