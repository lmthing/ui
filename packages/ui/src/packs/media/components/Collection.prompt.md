## Purpose

See one show's details, start the whole series and follow new releases.

## Pick

The overview at the top of one show, album, book or course, with artwork, credits, play-all and follow. A homepage's main headline over a large photo is Hero; Photo is only a picture with an optional caption. Not a person (Profile), one recording (Player), or owned things (Things).

## Writer

- Count and duration come from Playlist on this screen; never write either value.
- Use detail "brief" only when asked to hide the description. Keep it in about and leave aspect null unless explicitly requested.
- Use style "album" for an album cover presentation, "book" for a book overview with the title above the cover, or "show" if the show layout is explicitly requested. Otherwise use style null. Only include rating (0–5), ratingCount, up to three short tags, and shelfStatus when supplied.
- For a generated image, use `media_cover` or `poster` in `photo`. Use only for a fictional collection with no supplied cover art. Keep any supplied reference. In an image slot, use a short plain noun phrase from the app’s world for `subject`; no style, camera, palette or layout words.
