# `social` pack

**Status:** revised · **Wave:** 4 · **Pick line:** People sharing with each other: posts, comments,
follows. Not a business's clients (`customers`).

## Purpose

A small community in one app: a club, a class, a neighbourhood, friends with a shared hobby. People post,
react, comment, vote, join challenges and events, and invite others. Everything here needs other people, so
the pack is tier `people` throughout.

## Apps it serves

Running or book club, neighbourhood board, class or parents' group, hobby community (plant swaps, bird
spotting), friends' challenge app, church or society news, fan club, alumni group.

## What the core already covers

- A member's page: `Profile`, `Stats` style `inline` (posts, followers, following) and a `Button` "Follow".
- Members: `People`; a ranking: `List` style `ranked`; a private chat: `Bubbles` with `Composer` style
  `reply`; notifications: `List`.
- Writing a post: `Composer` style `entry` with `Field` kind `photo`; keep-or-skip offers: `SwipeStack`.
- Report, block or delete: a `Sheet` style `menu` (items with `danger`) opened by a post's `more` part.

The first plan's `Follow` is `Profile` plus `Stats` plus `Button`, `Reactions` is a part of `Post` and
`Feed`, and `Leaderboard` is core `List` style `ranked`.

## Components (8)

### `Feed` · planned · content · people
Posts from several people, newest first: avatar, name, time, text clipped to three lines, an optional photo,
and like and comment counts, each opening the post.
- Pick: many posts to scroll. Not one post in full (`Post`), not a list of things (`List`), not one's own
  journal (mind `Entries`), not chat messages (`Bubbles`).
- Writes: `posts` of `name` text(24), `photo` (avatar), `time` text(12), `text` text(280), `image`
  optional, `likes` number, `comments` number, `liked` boolean, `goto`, 1–6.
- Parts → actions: items `root press`, items `like toggle`. · States: filled, empty, loading.
- Real path: posts in a shared app.

### `Post` · planned · content · people
One post in full: author with avatar and time, the whole text, photos as a carousel, a reaction bar (like,
comment, share) with counts, and a "more" button for report, block or delete.
- Pick: one post, read fully. Not many posts (`Feed`), not an article (media `Article`).
- Writes: `name` text(24), `photo`, `time` text(12), `text` text(1000), `images` 0–4, `likes` number,
  `comments` number, `liked` boolean.
- Parts → actions: `like toggle`, `comment press`, `share press`, `more press` (opens the screen's `Sheet`
  menu). · States: filled, loading.
- Real path: a post in a shared app.

### `Comments` · planned · content · people
Replies under a post: avatar, name, time, the text, a like and a reply link, replies indented one level.
- Pick: replies to something posted. Not a two-person conversation (`Bubbles`), not reviews of a business
  (customers `Review`).
- Writes: `comments` of `name` text(24), `photo`, `time` text(12), `text` text(240), `likes` number,
  `reply` boolean (indented under the previous top-level one), 1–6.
- Parts → actions: items `like toggle`, items `reply press`, items `more press`. · States: filled, empty.
- Real path: comments in a shared app; new ones come from `Composer` style `reply` after it.

### `Poll` · planned · input · people
A question with two to five options; before voting each is a button, after voting each shows its share as a
bar with the person's choice ticked, and the vote count and closing date under it.
- Pick: asking a group to vote. Not choosing for oneself (`Choice`), not a quiz with a right answer
  (learning `Quiz`), not finding a date (events `FindDate`).
- Writes: `question` text(80), `options` of `label` text(32), `votes` number, 2–5; `voted` index
  optional; `closes` date optional. Shares and the total are computed.
- Parts → actions: items `root select`. · States: filled, success (voted).
- Real path: votes counted in a shared app.

### `Stories` · planned · content · people
A row of round avatars with a ring for unseen stories, the person's own first with an add button.
- Pick: short-lived updates from people to tap through. Not members of a group (`People`), not photos
  (`Gallery`).
- Writes: `people` of `name` text(12), `photo`, `seen` boolean, `goto`, 1–10; `mine` boolean.
- Parts → actions: items `root press`, `add press` (`partTiers`: `ok`, it opens the camera).
- States: filled, empty. · Real path: stories in a shared app, gone after a day.

### `EventCard` · planned · content · people
A community event as a card: date block (day and month), title, time and place, a photo, who is going as an
avatar stack, and "Going" or "Interested".
- Pick: an event to join in a community. Not organising one's own event (`events` pack), not a booking with a
  provider (booking `Appointment`).
- Writes: `title` text(40), `date`, `time` HH:MM, `place` text(40), `photo` optional, `going` number,
  `status` (`none`, `going`, `interested`), `goto`; `attendees` names text(24) each, 0–5 optional.
  The avatar stack draws `attendees`; the `going` count covers the rest.
- Parts → actions: `going press`, `interested press`, `root press`. · States: filled, loading.
- Real path: an event in a shared app.

### `Challenge` · planned · data · people
A group challenge: its goal ("Walk 100 km in November"), days left, the group's total as a bar, the person's
own part, and the top three.
- Pick: a shared goal a group works toward. Not one's own goal (`Ring`), not a full ranking (`List` style
  `ranked`).
- Writes: `title` text(40), `goal` number, `unit` text(8), `total` number, `mine` number, `ends` date,
  `top` of `name` text(20), `value` number, 0–3; `joined` boolean; `goto` (where `log` leads). Days left are
  computed.
- Parts → actions: `join press`, `log press` (goes to `goto`, a screen with a `Counter` or `Field`).
- States: filled, success (goal reached). · Real path: members' entries summed in a shared app.

### `Invite` · planned · action · people
Bringing others in: an invite code with copy and share, a QR code, and how many have joined from it.
- Pick: inviting people to the app or a group. Not sharing one post (`Post` share), not a list of members
  (`People`).
- Writes: `title` text(32), `code` text(12), `joined` number optional, `qr` boolean.
- Parts → actions: `copy press`, `share press`. · States: filled.
- Real path: an invite code from a shared app; sharing uses the phone's share sheet.

## Archetypes (5)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `feed` | What people shared | `posts`, `poll` | `posts`: Header, Stories, Feed, Button · `poll`: Header, Poll, Feed |
| `post` | One post and its replies | `thread`, `compose` | `thread`: Header[back], Post, Comments, Composer[reply] (Sheet[menu] for more) · `compose`: Header, Composer[entry], Field[photo], Button |
| `event` | One gathering or challenge | `event`, `challenge` | `event`: Header[back], EventCard, Comments, Composer[reply] · `challenge`: Header, Challenge, List[ranked] |
| `members` | Who is here | `list`, `member`, `invite` | `list`: Header, Search, People · `member`: Header[back], Profile, Stats[inline], Button, Feed · `invite`: Header, Invite, People |
| `swap` | Offers to keep or skip | `deck` | Header, SwipeStack, Button |

## Worked example: Fernpost

A plant-swap community. The `feed` shows cuttings people are offering; `feed/poll` asks which day suits the
next swap meet; the meet is an `EventCard` with 14 going; a November `Challenge` counts plants propagated;
`swap/deck` lets a member swipe through cuttings to keep or skip; new members join from `members/invite`.
Signature: `card_swipe` on the swap deck.

## Tiers

All components need other people; `Stories` add opens the camera (`ok`). A first showcase shows the
community with sample members and says that a real one needs a shared app.

## Build notes

- Order: `Feed`, `Post`, `Comments`, `Poll`, `EventCard`, `Challenge`, `Stories`, `Invite`.
- Counts such as likes and votes are seed values stored on the post; the shares in `Poll` and days left in
  `Challenge` are computed.

## Open questions

- **Direct messages?** Default: core `chat` archetype; no pack component.
