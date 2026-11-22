## Purpose

Browse recent posts shared by several people.

## Pick

Several community posts to scroll, with authors, short excerpts and reactions. Not one full post (Post), ordinary tappable rows (List), a private journal (Entries), or chat messages (Bubbles).

## Writer

- For "hide attached post pictures", write media "none" and keep the author avatars. For a photo grid write "arrange":"grid","media":null and use image on each row that has an attached photo.
- A visible photo is ordinary content, not a request for a "media" variant. Use "media":null unless the brief says to hide attachments. Put a video poster reference in video (lib: or local:); the host supplies playback.
- Use null for each unrequested reposts, reposted and saved field; zero and false are explicit states, not placeholders. For quoted text use quote. For an existing upvote or downvote use vote up or down.
- Put a neighborhood alert category in alertTag, never tags. Tags are ordinary topic labels. RadiusKm is the stated neighborhood distance in kilometers. Use null for unrequested options.
- Put the newest post first. Keep the full excerpt even if it clips on screen. Each post needs an avatar (use lib:people if unspecified), time, excerpt and destination. Use zero for unknown counts and false for unknown liked state.
