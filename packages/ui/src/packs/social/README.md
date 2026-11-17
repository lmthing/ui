# packs/social

Pack `social`: People sharing with each other: posts, comments, follows.

Built in step U7 (drafts in U3), wave 4 of the catalog plan. Read `docs/catalog/packs/social.md` (every component, archetype and the worked example) and plan 4.4 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):
- `pack.ts`, `example.jsonl` (a worked example app as JSON Lines, every line validates)
- `components/`: `Feed.tsx` `Post.tsx` `Comments.tsx` `Poll.tsx` `Stories.tsx` `EventCard.tsx` `Challenge.tsx` `Invite.tsx`
- `archetypes/`: `feed.ts` `post.ts` `event.ts` `members.ts` `swap.ts`

Rules:
- Each component's purpose, pick, props with limits, parts, actions, states and tier are in the catalog plan.
- Ids are PascalCase and equal the file names, unique across core and packs. Follow the pack rules in `docs/catalog/packs/README.md`.
- Each component ships with two examples, its renderer in its own file, and a part in the worked example.
