# packs/content/components

Component files of the `content` pack.

Built in step U3 (drafts), then U7. Read plan 4.2 and 4.4 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):
- `Article.tsx`
- `RichText.tsx`
- `Player.tsx`
- `Playlist.tsx`
- `Episode.tsx`
- `ChapterList.tsx`

Rules:
- Same file shape as `src/components/`: exports `meta`, `props`, `fallback`, `examples`, view.
- Draft files (`status: "draft"`) have no view yet.
