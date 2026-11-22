# packs/social/components

Component files of the `social` pack.

Built in step U3 (drafts), then U7. Read `docs/catalog/packs/social.md`, plan 4.2 and 4.4 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):
- `Feed.tsx`
- `Post.tsx`
- `Comments.tsx`
- `Poll.tsx`
- `Stories.tsx`
- `StoryViewer.tsx`
- `EventCard.tsx`
- `Challenge.tsx`
- `Invite.tsx`

Rules:
- Same file shape as `src/components/`: exports `meta`, `props`, `fallback`, `examples`, `probes`, view.
- Draft files (`status: "draft"`) have no view yet.
