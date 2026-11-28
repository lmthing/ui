## Purpose

Recognise one business client, their next visit and how to contact them.

## Pick

One business client's page head with tenure, next booking or order, tags and contact actions. Not another kind of identity (Profile), multiple clients as tappable rows (List), or plain labelled phone and address details without contact buttons (KeyValue). All clients with a photo and last-visit detail on each row remain List, never this one-client page head.

## Writer

- A portrait request is photo data, not a media option: write the photo reference and media: null. Never write media: "thumb" for the default photo. Use media: "none" only when asked to omit the photo.
- To hide only tenure, next booking and tags, use {"media":null,"detail":"brief"} and keep those values.
- Only include company if known. For a balance badge, use billing with known charged and paid amounts; the card computes the difference. Set email true only to offer an email button for a client with email contact.
- For a generated image, use `avatar` in `photo`. Use only for a fictional illustrated client, never to represent an actual person. Keep any supplied reference. In an image slot, use a short plain noun phrase from the app’s world for `subject`; no style, camera, palette or layout words.
