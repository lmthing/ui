# @lmthing/photos (optional)

About 150 bundled photos tagged by subject, plus generated gradient avatars.

Built in step U8. Read plan 6 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):
- `assets/` one folder per tag (plants, food, places, people, pets, objects)
- `manifest.ts` tag to files with licence and source per file
- `index.ts` `resolvePhoto(tag)`

Rules:
- Only CC0 or equivalent. Record source and licence for every file.
- A check script fails if a tag has fewer than 3 photos, a file has no licence entry, or a file exceeds 120 KB (WebP, 1080 px long side).
- `resolvePhoto("lib:plants")` picks deterministically from the tag and the component address.
- No image model in the live path. Until this exists, hosts use a tinted placeholder.
