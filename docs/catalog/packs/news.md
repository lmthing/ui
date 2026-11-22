# `news` pack

**Status:** planned · **Wave:** 6 · **Pick line:** Breaking news, journalism and magazines: headline rivers,
multi-source bias clusters, live blogs, breaking tickers, digests and outlet follows. Not book/audio
libraries (`media`), not user posts (`social`).

## Purpose

Reading journalism and following developing news events: dense headline rivers with publisher attribution,
multi-outlet story clusters showing coverage balance across perspectives, reverse-chronological live blogs
with pinned key points, urgent breaking-news tickers, curated daily briefings with completion ticks, and
publisher or beat follow controls. Long-form article reading uses wave 6 core `Article`; audio briefings
use core `Player`.

## Apps it serves

National or local news reader, multi-source media-bias aggregator, breaking scanner & emergency ticker,
daily morning/evening news digest app, independent journalism newsletter reader.

## What the core already covers

- Reading full formatted articles with paper themes and font scale: wave 6 core `Article`.
- Audio news briefings and clips: core `Player[compact]`.
- Filtering news beats and searching stories: `Search`, `Chips`, `FilterBar`.
- Local crime or incident pins on a map: `MapPins` (or `places` `MapList`); paywalls: core `plans`.
- Social discussion threads, comments, and polls: `social` (`Feed`, `Comments`, `Poll`); book/podcast
  libraries: `media` (`Library`, `Playlist`).

`HeadlineRiver` stays for journalism streams with outlet badges, 100-char headlines, and bookmark/share
toggles; `StoryCluster` for multi-outlet comparison cards with perspective spectrum bars; `LiveBlog` for
timestamped live reporter dispatches and key-event toggles; `BreakingTicker` for urgent severity-tagged
alert strips; `EditionDigest` for numbered daily briefings ("5 Things Today"); and `OutletFollow` for
publisher mute and alert-level controls.

## Components (6)

### `HeadlineRiver` · planned · content · service
Journalism feed displaying each story's publisher badge, up to 100-character headline, optional dek snippet,
thumbnail photo, relative timestamp, topic pill, read marker, and inline bookmark and share toggles.
- Pick: browsing journalism articles, newsletter dispatches, or local news alerts. Not user social posts
  (social `Feed`), not short 32-character rows (`List`), not multi-outlet clusters (`StoryCluster`).
- Writes: `stories` of `storyId` text(24), `outlet` text(20), `headline` text(100), `dek` text(120)
  optional, `topic` text(16), `publishedAt` ISO datetime with offset, `photo` optional, `saved` boolean
  (default false), `read` boolean (default false), `goto` (article screen), 1–12; `style`. Relative elapsed
  times are computed from `publishedAt` by code.
- Styles: `river` (default, editorial cards with publisher badge, headline, dek, and thumbnail), `compact`
  (dense headline rows with topic tag and timestamp).
- Parts → actions: stories `root press` (opens `goto`), stories `save toggle`, stories `share press`.
- States: filled, empty, loading, error (news feed refresh failed).
- Real path: article streams fetched from news publishers or an aggregator service (`service`).
- Density: `meta.dense: true`, weight 3; a news river scans up to 12 headlines per screen.
- Renderer: use `FeedRow` for outlet, timestamp, headline, thumbnail and bookmark/share accessories.

### `StoryCluster` · planned · content · service
Multi-outlet coverage card for one news event showing the cluster headline, total source count, a 3-way
perspective/coverage spectrum share bar (`KitShare`, e.g., Left / Center / Right or Local / National /
Wire), and 2–5 competing outlet headline rows with stance labels and article links.
- Pick: comparing how multiple news outlets report and frame the same event. Not single-source feeds
  (`HeadlineRiver`), not generic percentage bars (`Bars[share]`), not chronological live updates (`LiveBlog`).
- Writes: `clusterTitle` text(90), `summary` text(140) optional, `totalSources` number ≥ 2, `spectrum` of
  `label` text(16), `count` number ≥ 0, `tone` (`accent`, `muted`, `warn`), 2–3; `angles` of `outlet`
  text(20), `lean` text(12), `headline` text(90), `publishedAt` ISO datetime with offset, `goto` (article
  screen), 2–5; `style`. Coverage share percentages are computed from `spectrum` counts by code.
- Styles: `full` (default, coverage spectrum bar plus competing outlet headlines), `summary` (cluster
  headline, source count, and spectrum bar only).
- Parts → actions: angles `root press` (opens `goto`), `expand toggle`.
- States: filled, empty, loading, error (cluster unavailable).
- Real path: clustered news events and outlet coverage classifications computed by an aggregator service
  (`service`).

### `LiveBlog` · planned · data · service
Reverse-chronological live reporting stream topped by a `LIVE` status header, last-updated time, and
pinned key-bullet summary, followed by timestamped reporter dispatches with author byline, optional photo,
and key-event highlight badges. A toggle filters the stream down to key events only.
- Pick: following unfolding breaking news, press conferences, or live event reporting. Not personal
  schedules (`Timeline`), not sports play-by-play (sports `MatchFeed`), not static essays (`Article`).
- Writes: `title` text(60), `live` boolean (default true), `keyPoints` text(80) each 0–4; `dispatches` of
  `dispatchId` text(24), `at` ISO datetime with offset, `author` text(24) optional, `headline` text(60)
  optional, `body` text(240), `photo` optional, `keyEvent` boolean (default false), 1–16; `style`. Code
  sorts dispatches newest-first and computes relative elapsed minutes since the latest update.
- Styles: `stream` (default, pinned key summary plus full dispatch cards), `timeline` (compact timestamped
  dispatch rail).
- Parts → actions: `refresh press`, `keyOnly toggle`.
- States: filled, empty, loading, error (live stream disconnected).
- Real path: live newsroom dispatches streamed or polled from a journalism service (`service`).
- Density: `meta.dense: true`, weight 3; evolving live blogs hold up to 16 chronological dispatches.
- Renderer: use `FeedRow` for dispatch content and `DateRows` for dated groups. News owns newest-first order, pinned summary, and the key-event filter.

### `BreakingTicker` · planned · content · service
Pinned urgent alert strip highlighting 1–4 developing stories with severity badges (`Urgent`, `Local Alert`,
`Developing`), concise headline, elapsed timestamp, dismiss button, and breaking-alert notification toggle.
- Pick: surfacing urgent breaking news or local scanner dispatches at the top of a screen. Not static
  app notices (`Banner`), not short explanatory text (`Note`), not full story feeds (`HeadlineRiver`).
- Writes: `alerts` of `alertId` text(24), `severity` (`urgent`, `local`, `developing`), `headline`
  text(80), `at` ISO datetime with offset, `goto` optional, 1–4; `alertsEnabled` boolean (default true),
  `style`. Relative elapsed minutes are computed by code.
- Styles: `strip` (default, single top urgent banner with stack count), `list` (up to 4 stacked severity
  alert rows).
- Parts → actions: alerts `root press` (opens `goto`), alerts `close dismiss`, `alerts toggle`.
  `meta.partTiers: { alerts: "ok" }`.
- States: filled, empty (hidden when no breaking alerts), loading.
- Real path: breaking news and local incident alerts pushed from a news service (`service`), with opt-in
  alert delivery requiring notification permission (`ok`).

### `EditionDigest` · planned · content · phone
Numbered daily news briefing ("Morning Edition · 5 Things Today") with completion progress meter, numbered
story cards displaying section pill, headline, short summary, read-completion checkmarks, and an optional
"Listen to briefing" jump button.
- Pick: presenting curated daily morning or evening news summaries with read-progress tracking. Not generic
  to-do lists (`Checklist`), not full articles (`Article`), not endless article feeds (`HeadlineRiver`).
- Writes: `edition` text(32), `date`, `audioMinutes` number 1–60 optional, `audioGoto` optional, `items` of
  `itemId` text(24), `section` text(16), `headline` text(80), `summary` text(140), `done` boolean (default
  false), `goto` (article screen), 3–6; `style`. Read count and completion ratio are computed by code.
- Styles: `numbered` (default, numbered digest cards with section pills and read ticks), `compact`
  (condensed checklist rows with completion counter).
- Parts → actions: items `root press` (opens `goto`), items `done check`, `listen press` (opens
  `audioGoto`).
- States: filled, empty, loading, success (all briefing items read).
- Real path: daily briefing edition cached locally on the device (`phone`); refreshing new daily editions
  fetches from a publisher service (`service`).

### `OutletFollow` · planned · input · phone
Publisher and news-beat preference rows showing publication icon/logo, name, beat tag, Follow/Following
toggle, notification-level selector (`All`, `Breaking`, `Off`), and a Mute Source switch that suppresses
stories and alert selectors when enabled.
- Pick: managing followed publications, journalists, newsletters, and beats with alert controls. Not filter
  chips (`Chips`), not social follower lists (social `FollowList`), not staff rosters (`People`).
- Writes: `sources` of `sourceId` text(24), `name` text(28), `beat` text(20), `logo` photo optional,
  `followed` boolean, `muted` boolean (default false), `notify` (`all`, `breaking`, `off`), 1–6; `style`.
  Followed and muted counts are computed by code; muting hides alert controls.
- Styles: `list` (default, full rows with follow toggle, notification level, and mute switch), `compact`
  (quick outlet follow toggles).
- Parts → actions: sources `follow toggle`, sources `notify select`, sources `mute toggle`.
  `meta.partTiers: { notify: "ok" }`.
- States: filled, empty, loading.
- Real path: followed outlets and muted sources stored locally on the device (`phone`), with push alert
  settings needing notification permission (`ok`).

## Archetypes (4)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `news_front` | Browse top headlines, breaking tickers, and local news alerts | `news_top`, `news_local` | `news_top`: Header, Search, BreakingTicker[strip], HeadlineRiver · `news_local`: Header, Chips, MapPins, BreakingTicker[list] |
| `news_coverage` | Compare multi-outlet story clusters, live blogs, and articles | `news_cluster`, `news_live`, `news_article` | `news_cluster`: Header, Segmented, StoryCluster, Note · `news_live`: Header[back], BreakingTicker[list], LiveBlog · `news_article`: Header[back], Article, Note, Button |
| `news_briefing` | Read daily curated editions and listen to audio briefings | `news_edition`, `news_listen` | `news_edition`: Header, EditionDigest, Note, Button · `news_listen`: Header[back], Player[compact], EditionDigest[compact] |
| `news_sources` | Manage followed publications, beats, muting, and alert levels | `news_manage` | Header, Search, Chips, OutletFollow |

Each archetype's `defaultLayout` is its first listed layout; all layout ids are `news_`-prefixed and
unique. Recipes use only core (including wave 6 core `Article`) plus `news`, stay within weight 7, and
keep at most one weight-3 block per screen.

## Worked example: Dispatch Daily (multi-source news reader)

A morning news reader opens `news_front/news_top` where a pinned `BreakingTicker[strip]` flags a transit
strike above 10 stories in `HeadlineRiver`. Tapping the morning briefing opens `news_briefing/news_edition`
with five numbered items in `EditionDigest` and a jump to `news_briefing/news_listen` using
`Player[compact]`. For a contested budget bill, `news_coverage/news_cluster` renders `StoryCluster` across
14 outlets (`4 Left / 6 Center / 4 Right`), while tapping any angle opens `news_coverage/news_article`
(`Article` in sepia paper) and ongoing floor updates stream in `news_coverage/news_live` (`LiveBlog`).
`news_sources/news_manage` tunes per-outlet notifications in `OutletFollow`. Signature: `check_burst` on
finishing the daily digest or `count_up` on sources compared.

## Tiers

`EditionDigest` and `OutletFollow` operate on the `phone` once cached; breaking-alert toggles on
`BreakingTicker` and notification levels on `OutletFollow` require `ok` permission (`!needs-ok`).
`HeadlineRiver`, `StoryCluster`, `LiveBlog`, and `BreakingTicker` feeds depend on publisher `service`
connections.

## Build notes

- Order: `HeadlineRiver`, `BreakingTicker`, `EditionDigest`, `OutletFollow`, `StoryCluster`, `LiveBlog`.
- Reuse `KitShare`, `KitRank`, `KitMeter`, `KitTime`, `KitContent`, and `KitTrail`; no new kit base or
  signature is needed.
- Always derive relative timestamps ("14m ago") and cluster percentages in code rather than model-written
  strings.
- Pair `news` with `social` for community comments/discussions, or with `places` for neighborhood incident
  maps.

## Open questions

- **New actions?** None. Article opens, bookmarking, muting, dismissing, checking digest items, and
  alert settings map to `press`, `toggle`, `dismiss`, `check`, and `select`.
- **Audio news summaries?** Handled via core `Player[compact]` linked from `EditionDigest` `audioGoto`
  rather than duplicating a player inside `news`.
