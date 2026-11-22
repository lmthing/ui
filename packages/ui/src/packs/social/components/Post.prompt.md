## Purpose

Read and react to one community post in full.

## Pick

One community post in full, with author, long text, optional photo carousel and like, comment and share controls. Not several posts (Feed), an article (Article), or one featured thing preview (Card).

## Writer

- Write null for unrequested variants, not an explicit default. If only asked to hide attachments, write "media":"none". Preserve the images array and the author photo.
- For a photo grid use "arrange":"grid","media":null.
- A visible photo is ordinary content, not a request for a "media" variant. Use "media":null unless the brief says to hide attachments. Put a video poster reference in video (lib: or local:); the host supplies playback.
- Use null for each unrequested reposts, reposted and saved field; zero and false are explicit states, not placeholders. For quoted text use quote. For an existing upvote or downvote use vote up or down.
- Put a neighborhood alert category in alertTag, never tags. Tags are ordinary topic labels. RadiusKm is the stated neighborhood distance in kilometers. Use null for unrequested options.
- Use images for up to four post attachments, not for the author avatar. Use zero for unknown counts and false for an unknown liked state.
