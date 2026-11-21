# `dating` pack

**Status:** planned · **Wave:** 6 · **Pick line:** Romantic and social matching: swipe/prompt match decks, Likes You/nearby grids, expiring match queues, match reveals, compatibility bars, icebreakers and date safety check-ins. Not public posts (`social`), not simple cards (`SwipeStack`).

## Purpose

Romantic and social matching from discovery to safe first dates: reviewing rich multi-photo and prompt profiles one by one, browsing incoming likes or proximity grids, managing time-limited match queues before they expire, celebrating mutual matches with an immediate opener, comparing trait compatibility and dealbreakers, answering icebreakers, and sharing live date safety check-ins.

## Apps it serves

Swipe-based dating app, prompt-led relationship app, personality/MBTI matchmaker, time-limited match queue app, proximity social discovery app, safety-first dating companion.

## What the core already covers

- 1:1 messaging after a match: `Bubbles` + `Composer[reply]`; active-now status strip: `People[rail]`.
- Profile editing and discovery preferences: `Profile`, `Field[range]` (age and distance sliders), `Field[photo]`, `Field[voice]`, `Composer[entry]`, `Chips`, `Choice`, `Button`.
- Live selfie verification capture: `Camera[photo]` on core `capture`.
- Generic single-photo keep/skip card deck without prompts or match actions: `SwipeStack`.

Separate `DiscoveryFilters`, `ProfileEditor` and `DateChat` components are dropped: filters use core `Field[range]` + `Chips` + `Choice`, and ongoing chat uses `Bubbles` + `Composer[reply]`. `MatchDeck` earns its place with multi-photo tap progression, per-prompt Like/Rose reactions and Rewind/Pass/SuperLike/Like/Boost controls; `LikesGrid` handles optionally blurred 2-column incoming-like and nearby grids; `MatchQueue` pairs 24-hour expiry rings with turn-flagged threads (`Your Turn`, `Opening Move`, `Rose`); `MatchReveal` delivers an instant opener on mutual match; `Compatibility` renders trait bars and dealbreaker ticks; `Icebreaker` offers quick-pick and custom Opening Moves; and `SafetyPass` handles trusted-contact date check-ins and confirmed unmatch/block/report actions.

## Components (7)

### `MatchDeck` · planned · content · people
Candidate dating profiles shown one at a time in either a swipeable stack or a scrollable prompt profile, displaying verified badge, name, age, distance, relationship intent chips, multi-photo tap progression dots, and prompt cards with per-prompt Like or Rose buttons. Five controls below trigger Rewind, Pass, SuperLike, Like and Boost.
- Pick: reviewing potential romantic or social matches one profile at a time. Not generic 1-photo item cards (`SwipeStack`), two-column grids (`LikesGrid`), or existing matches (`MatchQueue`).
- Writes: `profiles` of `profileId` text(32), `name` text(24), `age` integer 18–99, `verified` boolean (default false), `distanceKm` number ≥ 0 optional, `intent` text(24) optional, `photos` 1–6, `prompts` of `prompt` text(80), `answer` text(160), 0–3, `badges` text(16) each 0–4, 1–6; `canRewind` boolean (default false), `style`. Active card cursor, photo progress index and remaining deck count are runtime state.
- Styles: `swipe` (default, swipeable card stack with photo tap progression), `prompts` (vertical profile with per-prompt Like and Rose triggers).
- Parts → actions: cards `root swipe` (top card only), cards `photo press` (advances photo), prompts `like press`, prompts `rose press`, `rewind press`, `pass press`, `superlike press`, `like press`, `boost press`.
- States: filled, empty (no nearby profiles left), loading, error (matching service or location unavailable).
- Real path: fetches candidate profiles from the matching service and records swipe, rose and rewind decisions remotely; composes `KitSwipeStack` at weight 3.

### `LikesGrid` · planned · content · people
Two-column grid of incoming likes or nearby profiles showing portrait photo (optionally blurred behind an upgrade prompt), name, age, distance or online status dot, quick reaction button and an unlock reveal CTA. Tapping an unblurred tile opens that profile.
- Pick: browsing grids of incoming likes or nearby profiles. Not one-by-one card decks (`MatchDeck`), plain photo albums (`Gallery`), or shop catalogs (commerce `ProductGrid`).
- Writes: `profiles` of `profileId` text(32), `name` text(24), `age` integer 18–99, `photo`, `blurred` boolean (default false), `online` boolean (default false), `distanceKm` number ≥ 0 optional, `goto` optional, 1–12; `upgradeGoto` optional, `style`. Visible count and locked-tile masking are computed; blurred tiles omit identifying details from reads and disable direct opening.
- Styles: `likes` (default, incoming likes with upgrade reveal CTA), `nearby` (proximity grid with online dot and quick wave/heart reaction).
- Parts → actions: tiles `root press` (unblurred linked only), tiles `react press` (nearby mode), `reveal press` (to `upgradeGoto`).
- States: filled, empty, loading.
- Real path: incoming likes and nearby grids load from the dating service; unblurring requires an active membership entitlement.
- Density: `meta.dense: true`, weight 3; two-column portrait grid displays up to 12 tiles.

### `MatchQueue` · planned · content · people
Horizontal rail of new matches surrounded by 24-hour expiry countdown rings above a list of active match conversations tagged with `"Your Turn"`, `"Opening Move"` or `"Rose"` status pills and message previews. Tapping any match opens the conversation or opener prompt.
- Pick: managing fresh expiring matches and turn-based match conversations. Not open message bubbles (`Bubbles`), multi-folder email or workplace chats (comms `Inbox`), or candidate discovery (`MatchDeck`).
- Writes: `newMatches` of `matchId` text(32), `name` text(24), `photo`, `expiresAt` ISO datetime with offset optional, `rose` boolean (default false), `goto`, 0–10; `threads` of `matchId` text(32), `name` text(24), `photo`, `snippet` text(60), `turn` (`your_turn`, `their_turn`, `opening_move`), `unread` boolean (default false), `updatedAt` ISO datetime with offset, `goto`, 0–12; `style`. Expiry countdown rings and remaining hours are computed from `expiresAt`.
- Styles: `queue` (default, expiry rail above turn-flagged threads), `rail` (horizontal new-matches rail only).
- Parts → actions: newMatches `root press`, threads `root press`.
- States: filled, empty, loading.
- Real path: active matches, expiry timestamps and turn indicators sync with the matching service; expired unstarted matches clear automatically.
- Density: `meta.dense: true`, weight 3; combines up to 10 expiring matches and 12 active threads.

### `MatchReveal` · planned · action · people
Mutual match celebration screen displaying overlapping portraits, the specific matched photo or prompt, two or three quick-pick opener chips and an inline opener input with Send. Sending a message opens the chat; keeping swiping dismisses the reveal.
- Pick: celebrating a mutual match and sending an immediate first message. Not generic completion feedback (`Success`), match queues (`MatchQueue`), or full chat transcripts (`Bubbles`).
- Writes: `matchId` text(32), `myPhoto` photo, `theirName` text(24), `theirPhoto` photo, `matchedOn` text(60) optional, `openers` text(80) each 0–3, `chatGoto` optional, `style`.
- Styles: `reveal` (default, overlapping portraits, matched snippet and inline opener), `compact` (match celebration banner with quick chips).
- Parts → actions: openers `root select`, `opener type`, `send send`, `keepSwiping press`. `meta.partTiers: { send: "people" }`.
- States: filled, loading, success (opener sent).
- Real path: triggered when a mutual like is confirmed by the dating service; `send` delivers the opening message to the match thread.

### `Compatibility` · planned · data · people
Two-person compatibility summary showing an overall match percentage ring, personality or trait comparison bars, shared-interest pills and dealbreaker alignment ticks.
- Pick: comparing two people's traits, compatibility score and dealbreaker alignment. Not personal goals (`Progress`), single metrics (`Stats`), or exam results (learning `Result`).
- Writes: `partnerName` text(24), `score` integer 0–100, `traits` of `label` text(24), `mine` number 0–1, `theirs` number 0–1, 1–6; `shared` text(20) each 0–6; `dealbreakers` of `label` text(24), `aligned` boolean, 0–6; `style`. Trait gaps and aligned dealbreaker counts are computed.
- Styles: `full` (default, score ring, trait bars, shared interests and dealbreakers), `compact` (score ring and dealbreaker ticks only).
- Parts → actions: `details press` (linked breakdown if provided).
- States: filled, empty, loading.
- Real path: computed by the matching service from both users' stored profile prompts, interests and dealbreaker preferences.

### `Icebreaker` · planned · input · people
Opening Move or compatibility question card presenting two to four quick-pick answers or a custom opener text box alongside Shuffle and Skip controls.
- Pick: answering an Opening Move prompt or sending a dating icebreaker. Not group polls (social `Poll`), graded quizzes (learning `Quiz`), or static selections (`Choice`).
- Writes: `questionId` text(32), `prompt` text(120), `quickAnswers` text(60) each 2–4, `customAllowed` boolean (default true), `mode` (`setup`, `opener`), `style`.
- Styles: `card` (default, question with quick chips and custom input), `compact` (prompt banner with shuffle).
- Parts → actions: quickAnswers `root select`, `custom type`, `shuffle press`, `skip press`, `submit send`. `meta.partTiers: { submit: "people" }`.
- States: filled, loading, success (saved or sent).
- Real path: loads prompt templates locally; saved Opening Moves attach to the profile and opener replies send through the match service.

### `SafetyPass` · planned · action · ok
Dating verification and "Share My Date" check-in card showing partner name, venue, scheduled start/end window, trusted contact and live check-in countdown with "I'm Safe" and "Alert Contact" controls, plus a moderation view with confirmed Unmatch, Block and Report actions.
- Pick: sharing a live date safety check-in or unmatching, blocking and reporting a match. Not passive notices (`Banner`), general family circle GPS (safety `SafetyCheckIn`), or venue directions (places `Address`).
- Writes: `partnerName` text(24), `matchId` text(32), `verified` boolean (default false), `venue` text(40) optional, `startsAt` ISO datetime with offset optional, `endsAt` ISO datetime with offset optional, `trustedContact` text(24) optional, `checkedIn` boolean (default false), `style`. Remaining date countdown is computed from `startsAt` and `endsAt`.
- Styles: `checkin` (default, Share My Date details and live countdown), `moderate` (confirmed Unmatch, Block and Report controls).
- Parts → actions: `shareDate press`, `safe check`, `alert press`, `unmatch press`, `block press`, `report press`. `meta.partTiers: { shareDate: "service", alert: "service", unmatch: "people", block: "people", report: "service" }`; `meta.confirmParts: ["alert", "unmatch", "block", "report"]`.
- States: filled, empty, loading, success (check-in shared or match removed), error (trusted contact or moderation service failed).
- Real path: uses location and notification permissions (`ok`) and messaging services (`service`) to notify a trusted contact, while moderation updates match state on the dating service.

## Archetypes (3)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `dating_discover` | Swipe profiles, view likes and set preferences | `dating_deck`, `dating_likes`, `dating_filters` | `dating_deck`: Header, MatchDeck, Note · `dating_likes`: Header, Chips, LikesGrid, Note · `dating_filters`: Header[back], Field[range], Field[range], Chips, Choice, Button |
| `dating_matches` | Manage match queues, reveals and openers | `dating_queue`, `dating_reveal`, `dating_icebreaker` | `dating_queue`: Header, MatchQueue, Note · `dating_reveal`: Header[back], MatchReveal, Compatibility[compact], Button · `dating_icebreaker`: Header[back], Icebreaker, Bubbles, Composer[reply] |
| `dating_profile` | View compatibility, safety check-in and profile | `dating_compat`, `dating_safety` | `dating_compat`: Header[back], Profile, Compatibility, Button · `dating_safety`: Header[back], Segmented, SafetyPass, KeyValue, Note |

The first listed layout is each `defaultLayout`; all layout ids are `dating_`-prefixed and unique. Recipes use only core plus `dating`, keep every screen between 3 and 6 components, total weight at most 7, and at most one weight-3 component per screen.

## Worked example: SparkNote

A prompt-and-compatibility dating app, unrelated to Ledge or Trot. `dating_discover/dating_deck` opens on Maya (29, verified, 4 km away) with four photos and two prompt cards; swiping right (`card_swipe`, the app's only signature) triggers `dating_matches/dating_reveal` when Maya has already liked back. `dating_reveal` shows `Compatibility[compact]` at 88% with shared hiking and film chips, and `dating_icebreaker` sends a quick-pick coffee opener into `Bubbles` + `Composer[reply]`.

On `dating_matches/dating_queue`, three new matches show 18h, 11h and 4h left on their 24-hour expiry rings above four active threads marked `"Your Turn"`. Before Friday's meetup, `dating_profile/dating_safety` shares the venue and 19:00–21:30 window with a trusted contact and starts the `"I'm Safe"` check-in countdown.

## Tiers

All seven components connect with other people (`people`), except `SafetyPass` whose main check-in flow requires notification/location permission (`ok`) and trusted-contact alert delivery (`service`). Selfie verification uses core `Camera[photo]` (`ok`); blurred `LikesGrid` reveals require a server-backed entitlement (`service`), and city proximity uses optional location permission (`ok`).

## Build notes

- Order: `MatchDeck`, `MatchQueue`, `MatchReveal`, `Icebreaker`, `LikesGrid`, `Compatibility`, `SafetyPass`; all remain planned.
- `MatchDeck` composes `KitSwipeStack` (`weight 3`, non-dense) with `when: { root: { $first: true } }` on card swipe actions; `LikesGrid` and `MatchQueue` are `dense` (`weight 3`). The remaining four components are weight 2.
- Writers use strict `writerFormat(registry)` for core plus `dating`; no aliases or off-pack fallbacks. Never seed derived countdown hours, alignment counts or blurred-profile names into reads.
- `KitPhoto` already supports `aspect` and avatar `ring`; `LikesGrid` blurred tiles keep visual masking inside the view/base without exposing identity in accessibility text.
- Each component later ships two domain examples, choose/write/read probes and declared part/state tests, plus a three-preset `example.jsonl`.

## Open questions

- **Voice and video prompts?** Default: core `Field[voice]` (`ok`) or `Player[audio]` on profile screens; no separate dating audio component unless misses ask.
- **Live video date calls?** Default: combine `dating` with `comms/ActiveCall` at app level rather than duplicating WebRTC call controls.
- **New action names?** None. Swipes use `swipe`; likes, roses, skips, alerts and blocks use `press`; check-ins use `check`; openers use `type`, `select` and `send`.
