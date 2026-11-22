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

## Components (13)

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

### `ActivityFeed` · planned · content · people
Grouped social notifications organized under time headings such as "Today" and "This week", pairing each actor's avatar and reaction or follow badge with a summary line, a target post thumbnail when relevant, and an inline Follow back or Accept request button. Tapping an entry opens the referenced post or member profile.
- Pick: social notifications, likes, mentions, replies, and follow alerts directed at the person. Not plain rows (`List`), system audit logs (data `ActivityLog`), or direct messages (`comms/Inbox`).
- Writes: `items` of `actor` text(24), `photo` optional, `kind` (`like`, `comment`, `mention`, `repost`, `follow`, `request`), `time` text(12), `bucket` (`today`, `week`, `earlier`), `summary` text(64), `targetPhoto` optional, `following` boolean optional, `goto` optional, 1–12; `style`. Time-bucket grouping is derived by code.
- Styles: `grouped` (default, bucket headings with actor avatars, target thumbnails, and inline buttons), `compact` (flat list without thumbnails).
- Parts → actions: items `root press`, items `follow toggle`, items `accept press`, items `decline press`. `meta.confirmParts: ["decline"]`.
- States: filled, empty, loading.
- Real path: activity notifications aggregated from member interactions in a shared social app.
- Density: `meta.dense: true`, weight 3; activity streams hold up to twelve grouped notifications across time buckets.
- Renderer: use `DateRows` for the owner-supplied time buckets and `FeedRow` for actor, timestamp and independently addressed follow/request actions.

### `Groups` · planned · content · people
Community, subreddit, or starter-pack discovery cards or rows displaying each group's icon or cover photo, name, topic tags, member and online counts, privacy pill ("Public", "Restricted", "Private"), and an inline Join or Joined toggle. Tapping a group opens its community feed or overview screen.
- Pick: discovering, browsing, and joining topical communities, subreddits, or local groups. Not club dues and eligibility governance (community `Members`), user directories (`FollowList`), or generic lists (`List`).
- Writes: `groups` of `name` text(32), `handle` text(24) optional, `about` text(80) optional, `icon` optional, `cover` optional, `tags` text(14) each 0–3, `members` integer ≥ 0, `online` integer ≥ 0 optional, `privacy` (`public`, `restricted`, `private`), `joined` boolean, `goto` optional, 1–6; `style`. Formatted member and online counts are rendered by code.
- Styles: `cards` (default, cover banner, summary, tags, and Join toggle), `rows` (compact directory rows with icon, counts, and Join toggle).
- Parts → actions: groups `root press`, groups `join toggle`.
- States: filled, empty, loading.
- Real path: community directory and membership state maintained in a shared social app.

### `StoryViewer` · planned · content · people
A full-bleed ephemeral story viewer displaying segmented top progress bars across slides, author header with avatar and timestamp, tap-to-advance or hold-to-pause navigation, an optional interactive sticker poll or link pill, and a bottom quick-reply and reaction bar. Sending a quick reply or reaction stays attached to the active slide without leaving the viewer.
- Pick: watching multi-slide ephemeral stories opened from `Stories`. Not the horizontal avatar strip (`Stories`), a static gallery (`Gallery`), or permanent feed posts (`Post`).
- Writes: `author` text(24), `avatar` optional, `slides` of `photo`, `time` text(12), `caption` text(120) optional, `sticker` (`kind`: `poll` or `link`, `label` text(40), `options` text(20) each 0–2, `goto` optional) optional, 1–8; `current` index (default 0), `paused` boolean (default false), `replyDraft` text(120) optional, `style`. Segmented slide progress and slide counts come from runtime state.
- Styles: `story` (default, full-bleed media with progress bars and bottom quick-reply dock), `clean` (hides reply dock for read-only viewing).
- Parts → actions: `prev press`, `next press`, `story pause`, `story play`, `sticker press`, `reply type`, `reply send`, `react press`, `close dismiss`.
- States: filled, empty (story expired or unavailable), loading, success (reply sent).
- Real path: ephemeral 24-hour story slides loaded from a shared social app; replies route to the author's message thread.
- Density: `meta.dense: true`, weight 3; a multi-slide story sequence holds up to eight timed media slides.

### `FollowList` · planned · content · people
A directory of followers, following accounts, or suggested creators displaying each person's avatar, display name, `@handle`, optional verified mark, one-line bio or mutual-follower summary, and an individual Follow or Following toggle per row. Tapping a row opens that person's profile screen.
- Pick: browsing followers, following lists, or suggested creators to follow. Not small team avatar lists (`People`), club governance with dues (community `Members`), or client records (customers `ClientCard`).
- Writes: `kind` (`followers`, `following`, `suggested`), `users` of `name` text(24), `handle` text(24), `photo` optional, `verified` boolean (default false), `bio` text(60) optional, `mutuals` text(32) optional, `following` boolean, `goto` optional, 1–12; `style`.
- Styles: `rows` (default, avatar, name, handle, bio or mutuals, and per-row Follow toggle), `compact` (name, handle, and toggle without bio lines).
- Parts → actions: users `root press`, users `follow toggle`.
- States: filled, empty, loading.
- Real path: follower graphs and follow toggles persisted in a shared social app.
- Density: `meta.dense: true`, weight 3; follow directories display up to twelve scrollable account rows.

### `LiveRoom` · planned · content · people
A live audio or broadcast stage displaying the room topic, host and speaker avatars with active-talker rings, live listener count, a Raise Hand toggle, and a reaction tray. Listeners can join the live audio room (`service`) and request to speak (`ok` microphone permission when promoted); hosts can mute speakers or end the room after confirmation. *(Core Watchlist candidate for `comms` and `learning`.)*
- Pick: hosting or listening to a live multi-speaker audio room. Not pre-recorded media (`Player`), private 1:1 or team calls (`comms/ActiveCall`), or async posts (`Feed`).
- Writes: `title` text(48), `topic` text(20) optional, `speakers` of `name` text(20), `photo` optional, `role` (`host`, `cohost`, `speaker`), `speaking` boolean (default false), `muted` boolean (default false), 1–12; `listenersCount` integer ≥ 0, `handRaised` boolean (default false), `isHost` boolean (default false), `style`. Active-talker rings and listener totals reflect runtime room state.
- Styles: `stage` (default, speaker avatar grid with active-talker rings, listener count, and raise-hand bar), `mini` (collapsed live bar showing room title, active speaker, and leave control).
- Parts → actions: `connect press` (joins live room stream), `speak toggle` (unmutes mic once promoted; uses device mic permission `ok`), `hand toggle` (Raise Hand), `react press`, `leave press`, `end press` (host only). `meta.confirmParts: ["end"]`; `meta.partTiers: { connect: "service" }`.
- States: filled, loading (connecting), success (room ended), error (audio connection lost).
- Real path: live multi-speaker audio rooms backed by a real-time audio service (`connect`) and device microphone permission (`ok`) for active speakers; live WebRTC/video codecs stay in `Canvas`.
- Density: `meta.dense: true`, weight 3; live stages display up to twelve host and speaker tiles simultaneously.

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

- Order: `Feed`, `Post`, `Comments`, `Poll`, `EventCard`, `Challenge`, `Stories`, `Invite`; Wave 6 additions follow in order: `ActivityFeed`, `Groups`, `StoryViewer`, `FollowList`, `LiveRoom`.
- Counts such as likes and votes are seed values stored on the post; the shares in `Poll` and days left in
  `Challenge` are computed.
- Wave 6 option upgrades on existing components: `Feed` and `Post` add `style: "stream" | "compact" | "grid" | "reel"` (`grid` for profile grids; `reel` for vertical short video + right-rail actions), plus `media` (video), `reposts`, `reposted`, `saved`, `quote`, `vote` (`up | down`), `tags`, and neighborhood radius/alert tag; `Comments` adds `badge` (`"OP"`, `"Mod"`), `replyCount`, and `reactionMode: "like" | "vote"`; `Poll` adds `multi: boolean` and `style: "bars" | "chips"`; `Stories` adds `style: "stories" | "notes"` (avatar thought-bubbles); `Invite` adds `style: "code" | "starter_pack"`.
- Wave 6 boundaries: multi-thread DM inboxes, server channels, and VoIP calls belong in `comms`, dating discovery in `dating`, club moderation queues in `community`, and AR camera lenses / live WebRTC codecs in `Canvas`. `LiveRoom` is on the Core Watchlist if `comms` and `learning` adopt live audio stages.

## Open questions

- **Direct messages?** Default: core `chat` archetype; no pack component.
