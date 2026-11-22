# `comms` pack

**Status:** planned · **Wave:** 6 · **Pick line:** Multi-thread messaging, channels, email, calls and dialers: chat/mail inboxes, server channels, live calls, call logs and T9 keypads. Not public feeds (`social`), club governance (`community`), or tickets (`requests`).

## Purpose

Direct and workplace communication in one place: multi-thread chat and email inboxes, collapsible email
threads, workspace/server channel navigation and streams, live 1:1 or group calls with pre-join lobbies,
post-meeting recaps, T9 phone dialers, visual voicemail call logs, and contact directories. Default
showcases present seeded sample threads, contacts, and call histories; live message delivery, email
transport, VoIP media, and PSTN calling require real outside services and permissions. Raw WebRTC video
codecs and AR camera lenses stay in `Canvas` / native adapters.

## Apps it serves

Consumer messengers (WhatsApp, Messenger, Telegram, Signal, Google Messages), workplace chat and
servers (Slack, Microsoft Teams, Discord), mobile email clients (Gmail, Outlook), and VoIP/caller-ID
phone apps (Zoom, TextNow, Truecaller).

## What the core already covers

- A single 1:1 chat thread: `Bubbles` (with Wave 6 group/status/attachment options) paired with
  `Composer[reply]`; Active Now presence strips: `People[rail]`; simple participant rosters: `People`.
- Non-image attachments on one email or recap screen: `FileList`; simple contact facts: `KeyValue`; a
  single featured announcement: `Banner` or `Card`.
- Composing a new message or email draft: `Field`s for recipients and subject with `Composer[entry]` and
  `Button` to send; finding threads or people: `Search` and `Chips`.
- Recording or playing back a standalone audio clip: `Player[audio]`; capturing a photo to share:
  `Camera[photo]` on `ok` tier.

`Inbox` stays for multi-thread chat and mail lists with pinned/unread grouping, delivery ticks, typing
dots, mute/star marks, and swipe/row actions rather than flat `List` rows or open `Bubbles`. `MailThread`
stays for collapsible email messages with `From/To/Cc/Bcc` headers and reply/forward controls, distinct
from team streams (`ChannelFeed`) and support tickets (`requests/RequestThread`). `ChannelSpace` and
`ChannelFeed` separate workspace channel trees and threaded emoji-reaction streams from club governance
(`community`) and public social feeds (`social`). `ActiveCall` handles live lobbies and call controls
separately from recorded `Player` playback, `MeetingRecap` captures speaker highlights and action items,
and `Dialer`, `CallLog`, and `Contacts` cover telephony, visual voicemail, and on-app vs SMS invites.
These packs are neighbours, never dependencies; combining `comms` with `workspace` or `social` is
chosen by the Director, never hardcoded in recipes.

## Components (9)

### `Inbox` · planned · content · people
Multi-thread conversation rows in chat or mail style with pinned items separated above recent activity.
Each row shows an avatar or initials badge, online or typing indicator, delivery ticks, unread count pill,
and mute or star icons. Tapping opens the thread while row controls pin, mute, archive, or confirm-delete it.
- Pick: scanning and triaging multiple chat or email threads. Not flat generic rows (`List`), an open
  1:1 conversation (`Bubbles`), a team channel sidebar (`ChannelSpace`), or public social posts
  (`social/Feed`).
- Writes: `threads` of `id` text(24), `title` text(32), `sender` text(24) optional, `preview` text(80),
  `time` text(12), `photo` optional, `unread` int 0–999 (default 0), `pinned` boolean (default false),
  `muted` boolean (default false), `starred` boolean (default false), `typing` boolean (default false),
  `online` boolean (default false), `delivery` (`none`, `sent`, `delivered`, `read`) optional, `label`
  text(16) optional (mail folders/tags), `goto` optional, 1–16; `style`. Code groups pinned threads
  first and computes total unread badges.
- Styles: `chat` (default, messenger rows with online/typing dots and delivery ticks), `mail` (email
  inbox rows with sender, subject title, snippet preview, star toggle, and folder/label pill).
- Parts → actions: `threads root press` (linked), `threads pin toggle`, `threads mute toggle`,
  `threads star toggle`, `threads archive press`, `threads delete press`.
  `meta.confirmParts: ["delete"]`.
- States: filled, empty, loading, error (sync failed; shows cached threads with retry).
- Real path: threads and unread states synced over a shared messaging or mail service; local drafts and
  cached summaries remain readable offline.
- Density: `meta.dense: true`, weight 3; messaging and mail inboxes display up to 16 scannable threads
  with status indicators and quick triage actions.

### `MailThread` · planned · content · people
A collapsible email thread displaying the subject line, folder label chips, and chronological messages.
Older turns fold down to sender and snippet, while expanded messages expose `From`, `To`, `Cc`, `Bcc`
headers, full body text, and attachment chips. Bottom actions launch Reply, Reply All, Forward, archive,
or confirmed delete.
- Pick: reading and responding to structured multi-recipient email threads. Not instant chat bubbles
  (`Bubbles`), workspace channel messages (`ChannelFeed`), or service-desk ticket updates
  (`requests/RequestThread`).
- Writes: `subject` text(80), `labels` text(16) each 0–4, `messages` of `id` text(24), `from` text(48),
  `to` text(48), `cc` text(48) optional, `bcc` text(48) optional, `time` text(16), `body` text(1000),
  `expanded` boolean (default false for older items, true on latest), `starred` boolean (default false),
  `attachments` of `name` text(32), `kind` (`pdf`, `doc`, `sheet`, `image`, `other`), `size` text(12),
  0–4, 1–8; `replyGoto` optional; `style`. Code keeps the latest message expanded by default when none
  are flagged.
- Styles: `collapsed` (default, previous replies folded), `expanded` (all messages opened inline).
- Parts → actions: `messages root toggle` (expand or collapse a message), `messages star toggle`,
  `attachments root press`, `reply press` (`replyGoto`), `replyAll press` (`replyGoto`), `forward press`
  (`replyGoto`), `archive press`, `delete press`.
  `meta.confirmParts: ["delete"]`; `meta.partTiers: { reply: "service", replyAll: "service", forward: "service" }`.
- States: filled, loading, error (message body failed to fetch).
- Real path: email thread fetched from an IMAP/JMAP or workspace mail service; sending replies opens the
  compose layout backed by the same mail account.

### `ChannelSpace` · planned · structure · people
A workspace or community server navigator with an optional header banner and collapsible channel categories.
`#text` and `#forum` channels surface unread dots and mention counts, while live voice rooms display
participant avatar stacks and Join controls. Tapping a category folds its rows and tapping a channel opens it.
- Pick: switching between channels, topics, and active voice rooms inside a server or workspace. Not a
  flat list of pages (`List`), a chat thread (`ChannelFeed`), or a club member register
  (`community/Members`).
- Writes: `spaceName` text(32), `banner` photo optional, `categories` of `id` text(24), `label` text(24),
  `collapsed` boolean (default false), `channels` of `id` text(24), `name` text(24), `kind` (`text`,
  `announcement`, `forum`, `voice`), `unread` boolean (default false), `mentions` int 0–99 (default 0),
  `locked` boolean (default false), `participants` text(24) each 0–6 (voice only), `goto` optional,
  1–10, 1–6; `activeChannel` text(24) optional; `style`. Code sums category mention badges.
- Styles: `workspace` (default, banner + collapsible categories + voice rooms), `compact` (dense channel
  rows without category banners).
- Parts → actions: `categories root toggle`, `channels root press` (text/forum navigation),
  `channels join press` (voice rooms only; `meta.partTiers: { join: "service" }`).
- States: filled, empty, loading, error (workspace unavailable).
- Real path: workspace channel directory and live voice-room presence backed by a shared team or server
  messaging service.
- Density: `meta.dense: true`, weight 3; server sidebars hold nested categories with up to 10 channels each.

### `ChannelFeed` · planned · content · people
A multi-author channel stream showing each message's author avatar, name, role badge, and timestamp.
Messages render formatted body text, file chips, interactive emoji reaction pills with counts, and an
`"N replies"` sub-thread link. Pairs with core `Composer[reply]` at the bottom of the screen to post updates.
- Pick: rendering team or server channel messages with emoji reactions, file chips, and sub-threads. Not
  1:1 or plain group chat (`Bubbles`), public social posts (`social/Feed`), or ticket audit logs
  (`requests/RequestThread`).
- Writes: `channel` text(24), `topic` text(60) optional, `posts` of `id` text(24), `author` text(24),
  `role` text(16) optional, `photo` optional, `time` text(12), `text` text(400), `pinned` boolean
  (default false), `files` of `name` text(28), `kind` (`pdf`, `doc`, `sheet`, `image`, `other`), 0–3,
  `reactions` of `emoji` text(8), `count` int ≥ 1, `reacted` boolean (default false), 0–5, `replies`
  int ≥ 0 (default 0), `replyUsers` text(24) each 0–3, `goto` optional, 1–12; `style`.
- Styles: `stream` (default, full messages with reactions and thread previews), `compact` (condensed
  consecutive messages by the same author).
- Parts → actions: `posts root press`, `posts react toggle`, `posts thread press`, `posts file press`.
- States: filled, empty, loading, error (channel stream failed to load).
- Real path: channel messages, reactions, and sub-threads synced across workspace members in a shared
  messaging service; new messages post via core `Composer[reply]`.
- Density: `meta.dense: true`, weight 3; channel streams render rich multi-part posts with reactions and
  attachments across up to 12 recent turns.
- Renderer: use `FeedRow` for author, avatar, time, body, replies and addressed reaction/file accessories.
  Use `DateRows` when grouping by date. Comms owns consecutive-message grouping, thread navigation and permissions.

### `ActiveCall` · planned · action · ok
A pre-join A/V lobby or active 1:1 and group call stage with live participant status. Lobby style shows
local mic and camera preview toggles alongside host waiting-room admit controls, while call style arranges
participant tiles with speaking rings and an elapsed timer. Mute, Speaker, Camera, and a confirmed End Call
button sit in the control bar.
- Pick: joining, moderating, or controlling an active voice or video call. Not playing recorded media
  (`Player`), patient telehealth queues (`medical/TelehealthVisit`), or public audio stages
  (`social/LiveRoom`).
- Writes: `title` text(32), `roomState` (`lobby`, `waiting`, `live`, `ended`), `participants` of `id`
  text(24), `name` text(24), `photo` optional, `muted` boolean (default false), `speaking` boolean
  (default false), `videoOn` boolean (default false), 1–8; `waiting` of `id` text(24), `name` text(24),
  0–4 (lobby host view); `startedAt` ISO datetime with offset optional; `micOn` boolean (default true);
  `speakerOn` boolean (default false); `cameraOn` boolean (default false); `style`. Elapsed call clock
  runs in code from `startedAt` while `roomState` is `live`.
- Styles: `lobby` (default, pre-join audio/video check and waiting-room admit list), `call` (active
  participant tiles, live timer, and call control bar).
- Parts → actions: `join press`, `admit press` (waiting-room host control), `mute toggle`,
  `speaker toggle`, `camera toggle`, `end press`.
  `meta.confirmParts: ["end"]`; `meta.partTiers: { join: "service", admit: "service", camera: "ok" }`.
- States: filled, loading (connecting), error (microphone/camera denied or call dropped).
- Real path: microphone and camera capture require device permissions (`ok`); live media transport and
  participant signaling use an external WebRTC/VoIP service (`Canvas` or native video surface for frames).

### `MeetingRecap` · planned · content · people
A post-meeting summary card linking back to the recorded session and extracted outcomes. It displays key
decisions, timestamped speaker highlights that jump straight to the moment, and owner-assigned action
checkboxes. Completing an action updates follow-up progress without leaving the recap.
- Pick: reviewing an AI or host-generated summary, decisions, speaker highlights, and follow-up action
  items after a call. Not formal club board minutes (`community/Minutes`) or ongoing project status
  reports (`projects/ProjectStatus`).
- Writes: `title` text(40), `date`, `duration` text(12), `summary` text(240), `decisions` text(80) each
  0–4, `highlights` of `speaker` text(24), `time` text(12), `quote` text(120), `seconds` int ≥ 0, 0–6,
  `actions` of `text` text(60), `owner` text(24) optional, `due` date optional, `done` boolean (default
  false), 0–6; `recordingGoto` optional; `style`.
- Styles: `summary` (default, decisions + highlights + action items), `transcript` (emphasises speaker
  highlight quotes alongside jump timestamps).
- Parts → actions: `play press` (opens `recordingGoto`), `highlights root press` (seeks or opens moment),
  `actions check check` (toggles follow-up completion).
- States: filled, empty (processing transcript), loading, error (recap unavailable).
- Real path: summary, speaker timestamps, and action items stored on the shared meeting record; checking
  an action updates the shared workspace task state.

### `Dialer` · planned · input · service
A T9 numeric phone keypad (`0–9`, `*`, `#`, `+`) built over `KitNumberPad` with a formatted number display
and backspace key. As digits are entered, a live banner previews any matching saved contact so the caller
can confirm who they are reaching. Dedicated Call and SMS buttons launch outbound communication.
- Pick: entering a phone number or extension to place a VoIP/PSTN call or start an SMS. Not entering
  currency sums (`money/AmountPad`), math expressions (`utilities/Calculator`), or security PINs
  (`security/CredentialVault`).
- Writes: `value` text(20) optional, `countryCode` text(6) optional, `match` (`name` text(24), `label`
  text(16), `photo` optional, `goto` optional) optional; `callGoto` optional; `smsGoto` optional; `style`.
  Formatted display string and matched-contact lookup come from code and the device/contact directory.
- Styles: `keypad` (default, full T9 dialpad with letters under digits), `compact` (tighter number bar
  and call action).
- Parts → actions: `pad type` (digits `0–9`, `*`, `#`, `+`, backspace), `clear press`, `match press`
  (opens matched contact), `call press`, `sms press`.
- States: filled, empty (no digits entered), loading, error (invalid number or calling service offline).
- Real path: places outbound calls or hands off to SMS via a VoIP carrier service or OS telephony intent;
  matching digits against saved contacts reads the local or synced contact directory.

### `CallLog` · planned · data · phone
A recent call and visual voicemail register with incoming, outgoing, missed, and blocked direction marks.
Rows display caller ID spam-risk tags, timestamp, call duration, one-tap callback triggers, and expandable
voicemail transcripts with playback controls. Unheard voicemails stand out until played.
- Pick: reviewing call history, caller ID risk badges, and visual voicemails. Not text conversation lists
  (`Inbox`), day schedules (`Timeline`), or contact directories (`Contacts`).
- Writes: `entries` of `id` text(24), `name` text(28), `number` text(20) optional, `photo` optional,
  `direction` (`in`, `out`, `missed`, `blocked`), `risk` (`none`, `verified`, `spam`) (default `none`),
  `at` text(16), `duration` text(12) optional, `voicemail` (`seconds` int ≥ 1, `transcript` text(160),
  `unheard` boolean) optional, `goto` optional, 1–6; `style`. Code formats missed/spam tones and
  computes unheard voicemail counts; overflows beyond six show shared "and N more" copy.
- Styles: `all` (default, calls and voicemails together), `voicemail` (voicemails only with transcript
  previews and play/pause controls).
- Parts → actions: `entries root press` (opens detail or contact), `entries call press`
  (`meta.partTiers: { call: "service" }`), `entries play play`, `entries play pause`,
  `entries remove press` (`meta.confirmParts: ["remove"]`).
- States: filled, empty, loading, error (carrier/call log unavailable).
- Real path: call history and voicemail audio stored by the device phone log or VoIP account; placing a
  callback uses the calling service (`!needs-service`).

### `Contacts` · planned · content · people
An alphabetical contact directory separating active on-app people from off-app phone contacts. Active
entries expose message, voice call, and video call actions alongside verified badges, while off-app
entries offer SMS invites. A blocked view lets the user inspect or unblock restricted contacts.
- Pick: finding people to message, call, invite, or block across a communication app. Not small task
  teams (`People`), business clients (`customers/ClientCard`), club dues rosters (`community/Members`),
  or workplace org charts (`team/TeamDirectory`).
- Writes: `contacts` of `id` text(24), `name` text(28), `handle` text(32) optional, `phone` text(20)
  optional, `photo` optional, `onApp` boolean (default true), `verified` boolean (default false),
  `blocked` boolean (default false), `status` text(36) optional, `goto` optional, 1–20; `style`. Code
  groups entries alphabetically and hides call/message triggers on blocked contacts.
- Styles: `directory` (default, A–Z sections with on-app actions and off-app invites), `blocked` (shows
  blocked contacts with unblock control).
- Parts → actions: `contacts root press`, `contacts message press`, `contacts call press`,
  `contacts video press`, `contacts invite press`, `contacts block press`.
  `meta.confirmParts: ["block"]`; `meta.partTiers: { call: "service", video: "service", invite: "service" }`.
- States: filled, empty, loading, error (contact sync failed).
- Real path: synced account directory and optional device address-book matching (requires contacts
  permission in a real build); messaging, calling, and SMS invites connect through external services.
- Density: `meta.dense: true`, weight 3; alphabetical contact directories scan up to 20 entries across
  section headers.

## Archetypes (4)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `comms_inbox` | Multi-thread chats and contact directory | `comms_chats`, `comms_contacts` | `comms_chats`: Header, Search, People[rail], Chips, Inbox[chat], Button · `comms_contacts`: Header, Search, Contacts, Button |
| `comms_channels` | Team server channels and message streams | `comms_server`, `comms_channel_chat` | `comms_server`: Header, Search, ChannelSpace, Note · `comms_channel_chat`: Header[back], ChannelFeed, Composer[reply] |
| `comms_calls` | Dialing, call history, live calls and recaps | `comms_dialer`, `comms_call_log`, `comms_active_call`, `comms_recap` | `comms_dialer`: Header, Dialer · `comms_call_log`: Header, Search, Chips, CallLog, Button · `comms_active_call`: Header[back], ActiveCall, Note · `comms_recap`: Header[back], Player[audio], MeetingRecap, Button |
| `comms_mail` | Email inbox, collapsed threads and composing | `comms_mail_box`, `comms_mail_thread`, `comms_compose_mail` | `comms_mail_box`: Header, Search, Chips, Inbox[mail], Button · `comms_mail_thread`: Header[back], MailThread, FileList, Button · `comms_compose_mail`: Header[back], Field, Field, Composer[entry], FileList, Button |

The first listed layout is each archetype's `defaultLayout`; every layout id is `comms_`-prefixed and
unique across the catalog. Recipes use only core components (including Wave 6 `FileList` and
`People[rail]`) plus `comms` pack components, keep at most one dense component per layout, and stay within
screen weight 12. `Dialer` owns the outbound call and SMS actions on `comms_dialer`, so no second primary
`Button` competes with it. Simple 1:1 chats can also reuse core `chat` (`Bubbles` + `Composer[reply]`).

## Worked example: Relay

A small community volunteer hub using `comms`. `comms_inbox/comms_chats` pairs `People[rail]` for who is
online now with `Inbox[chat]` showing a pinned dispatch thread and unread volunteer DMs; tapping New opens
`comms_contacts` to message an active volunteer or send an SMS invite. Inside the coordinators' server,
`comms_channels/comms_server` lists `#general`, `#weekend-shifts` (2 mentions), and a `Field Team` voice
room; opening `#weekend-shifts` renders `ChannelFeed` with file chips and emoji reactions followed by
`Composer[reply]`. For voice follow-ups, `comms_calls/comms_dialer` matches a typed prefix to a volunteer
on `Dialer`, `comms_call_log` highlights a missed call and transcribed voicemail, `comms_active_call` shows
the pre-join lobby and live call controls, and `comms_recap` pairs `Player[audio]` with `MeetingRecap`
action items. Signature: `check_burst` on completing a follow-up item in `MeetingRecap`; no new signature.

## Tiers

`CallLog` history browsing works locally on the phone (`phone`), with callbacks marked `!needs-service`.
`Inbox`, `MailThread`, `ChannelSpace`, `ChannelFeed`, `MeetingRecap`, and `Contacts` are `people` tier
for multi-user communication, with email sending, voice-room join, calls, video, and SMS invites marked
`!needs-service`. `ActiveCall` requests microphone/camera permissions (`!needs-ok`) and external media
signaling (`!needs-service`), while `Dialer` is `service` tier throughout.

## Build notes

- Order: `Inbox`, `ChannelSpace`, `ChannelFeed`, `MailThread`, `Contacts`, `CallLog`, `Dialer`,
  `ActiveCall`, `MeetingRecap`; all remain planned.
- Use strict `writerFormat(registry)` for core plus selected packs only; no aliases or off-pack fallbacks.
  Each component ships two examples, choose/write/read probes, kit-only drawings, and a pack `example.jsonl`
  rendered in three presets.
- `Dialer` reuses existing `KitNumberPad` with caller-supplied T9 sublabels (`ABC`, `DEF`, etc.); do not
  invent a new keypad base.
- `Inbox`, `ChannelSpace`, `ChannelFeed`, and `Contacts` carry `meta.dense: true` (weight 3) with bounded
  seed arrays; `CallLog` caps at six rows with shared "and N more" overflow copy.
- Destructive controls (`Inbox.delete`, `MailThread.delete`, `ActiveCall.end`, `CallLog.remove`,
  `Contacts.block`) declare `meta.confirmParts` and route through the shared confirmation dispatcher.
- Code owns unread totals, pinned ordering, elapsed call clocks, and voicemail unheard counts; Writers
  never invent pre-formatted summary strings or fake carrier statuses.

## Open questions

- **New action names?** None. All actions use the existing `ActionName` vocabulary (`press`, `toggle`,
  `check`, `type`, `play`, `pause`).
- **Live WebRTC video & SIP dialing?** Default: declarative lobbies, participant tiles, call timers, and
  controls only; raw video streams and carrier SIP/VoIP bridges remain host/`Canvas` adapters.
- **Standalone 1:1 messaging?** Core `Bubbles` + `Composer[reply]` covers single threads; `comms` is chosen
  when an app needs multi-thread inboxes, email, channels, calls, or dialers.
