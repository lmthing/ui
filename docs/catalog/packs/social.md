# `social` pack

**Status:** revised · **Wave:** 4 · **Pick line:** People sharing with each other: posts, comments,
follows. Not a business's clients (`customers`).

## Purpose

A small community in one app: a club, a class, a neighbourhood, a group of friends with a shared hobby.
People post, react, comment, vote, join challenges and events, and invite others. Everything here needs
other people, so the pack is tier `people` almost throughout.

## Apps it serves

Running or book club, neighbourhood board, class or parents' group, hobby community (plant swaps, bird
spotting), friends' challenge app, church or society news, fan club, alumni group.

## What the core already covers

- A person's page: `Profile`, `Stats` style `inline` (posts, followers, following) and a `Button` "Follow".
- Members: `People`; a ranking: `List` style `ranked`; a chat: `Bubbles` with `Composer` style `reply`.
- Writing a post: `Composer` style `entry` with `Field` kind `photo`; a notification list: `List`.

The first plan's `Follow` is the `Profile` plus `Stats` plus `Button` above, `Reactions` is a part of
`Post` and `Feed`, and `Leaderboard` is core `List` style `ranked`.

## Components (8)

### `Feed` · planned · content · people
Posts from several people, newest first: avatar, name, time, text clipped to three lines, an optional photo,
and like and comment counts, each opening the post.
- Pick: many posts to scroll. Not one post in full (`Post`), not a list of things (`List`), not chat
  messages (`Bubbles`).
- Writes: `posts` of `name` text(24), `photo` (avatar), `time` text(12), `text` text(280), `image`
  optional, `likes` number, `comments` number, `liked` boolean, `goto`, 1–6.
- Parts → actions: items `root press`, items `like toggle`. · States: filled, empty, loading.
- Real path: posts in a shared app. · Aliases: feed, wall, posts, newsfeed.

### `Post` · planned · content · people
One post in full: author with avatar and time, the whole text, photos as a carousel, and a reaction bar
(like, comment, share) with counts.
- Pick: one post, read fully. Not many posts (`Feed`), not an article (media `Article`).
- Writes: `name` text(24), `photo`, `time` text(12), `text` text(1000), `images` 0–4, `likes`,
  `comments`, `liked` boolean.
- Parts → actions: `like toggle`, `comment press`, `share press`. · States: filled, loading.
- Real path: a post in a shared app. · Aliases: post, status, update.

### `Comments` · planned · content · people
Replies under a post: avatar, name, time, the text, a like and a reply link, with replies indented one level.
- Pick: replies to something posted. Not a two-person conversation (`Bubbles`), not reviews of a business
  (customers `Review`).
- Writes: `comments` of `name` text(24), `photo`, `time` text(12), `text` text(240), `likes` number,
  `reply` boolean (indented under the previous top-level comment), 1–8.
- Parts → actions: items `like toggle`, items `reply press`. · States: filled, empty.
- Real path: comments in a shared app; new ones come from `Composer` style `reply` after it.
- Aliases: comments, replies, thread, discussion.

### `Poll` · planned · input · people
A question with two to five options; before voting each is a button, after voting each shows its share as a
bar with the person's choice ticked, and the vote count and closing time under it.
- Pick: asking a group to vote. Not choosing for oneself (`Choice`), not a quiz with a right answer
  (learning `Quiz`).
- Writes: `question` text(80), `options` of `label` text(32), `votes` number, 2–5; `voted` index optional;
  `closes` text(20) optional.
- Parts → actions: items `root select`. · States: filled, success (voted).
- Real path: votes counted in a shared app. · Aliases: poll, vote, survey.

### `Stories` · planned · content · people
A row of round avatars with a ring for unseen stories, the person's own first with an add button.
- Pick: short-lived updates from people to tap through. Not members of a group (`People`), not photos
  (`Gallery`).
- Writes: `people` of `name` text(12), `photo`, `seen` boolean, 1–10; `mine` boolean.
- Parts → actions: items `root press`, `add press`. · States: filled, empty.
- Real path: stories in a shared app, gone after a day. · Aliases: stories, statusring, moments.

### `EventCard` · planned · content · people
A community event as a card: date block (day and month), title, time and place, a photo, who is going as an
avatar stack, and "Going" or "Interested".
- Pick: an event to join in a community. Not organising one's own event (`events` pack), not a booking with a
  provider (booking `Appointment`).
- Writes: `title` text(40), `date`, `time` text(12), `place` text(40), `photo` optional, `going` number,
  `status` (`none`, `going`, `interested`), `goto`.
- Parts → actions: `going press`, `interested press`, `root press`. · States: filled, loading.
- Real path: an event in a shared app. · Aliases: event, meetup, gathering.

### `Challenge` · planned · data · people
A group challenge: its goal ("Walk 100 km in November"), the days left, the group's total as a bar, the
person's own part, and the top three.
- Pick: a shared goal a group works toward together. Not one's own goal (`Ring`), not a full ranking (`List`
  style `ranked`).
- Writes: `title` text(40), `goal` number, `unit` text(8), `total` number, `mine` number, `ends` date,
  `top` of `name` text(20), `value` number, 0–3; `joined` boolean.
- Parts → actions: `join press`, `log press`. · States: filled, success (goal reached).
- Real path: entries from members summed in a shared app. · Aliases: challenge, groupgoal, competition.

### `Invite` · planned · action · people
Bringing others in: an invite code or link with copy and share, a QR code, and who has joined from it.
- Pick: inviting people to the app or a group. Not sharing one post (`Post` share), not a list of members
  (`People`).
- Writes: `title` text(32), `code` text(12), `joined` number optional, `qr` boolean.
- Parts → actions: `copy press`, `share press`. · States: filled.
- Real path: an invite code made by a shared app; sharing uses the phone's share sheet.
- Aliases: invite, sharelink, referral, invitecode.

## Archetypes (3)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `feed` | What people shared | `posts`, `stories` | Header, Stories, Feed, Button |
| `post` | One post and its replies | `thread` | Header[back], Post, Comments, Composer[reply] |
| `event` | One gathering or challenge | `event`, `challenge` | `event`: Header, EventCard, People[stack], Comments · `challenge`: Header, Challenge, List[ranked] |

## Worked example: Fernpost

A plant-swap community. The `feed` shows cuttings people are offering with photos; a `Poll` asks which day
suits the next swap meet; the meet is an `EventCard` with 14 going; a November `Challenge` counts new plants
propagated. New members join from an `Invite` code. Signature: `card_swipe` on cuttings to keep or skip.

## Aliases that shadow the core

With `social`: `feed`, `posts` → `Feed` (otherwise `List`); `comments`, `thread` → `Comments` (otherwise
`Bubbles`); `poll`, `vote` → `Poll` (otherwise `Choice`); `event` → `EventCard` (otherwise `Card`).

## Tiers

All components need other people. A first showcase shows the community with sample members and says that a
real one needs a shared app.

## Build notes

- Order: `Feed`, `Post`, `Comments`, `Poll`, `EventCard`, `Challenge`, `Stories`, `Invite`.
- Moderation (report, block) is a `Sheet` style `menu` from the post's header action; no component.

## Open questions

- **Direct messages?** Default: core `chat` archetype; no pack component.
