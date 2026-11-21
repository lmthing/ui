# `assistant` pack

**Status:** planned · **Wave:** 6 · **Pick line:** Conversational AI workspaces: streaming markdown/code turns, web citations, tool traces, prompt starters, artifacts and voice mode. Not human chat (`comms`, `Bubbles`), not graded quizzes (`learning`).

## Purpose

Conversational AI companions, grounded answer engines, and workspace copilots: multi-turn streaming
prose and code blocks, model/mode-aware prompting with file, photo, and voice attachments, categorized
starter prompts, cited web or document sources, transparent tool-call execution traces, inspectable
generated artifacts, live hands-free voice sessions, and grouped thread archives. A first showcase runs
against seeded conversations and responses; live inference, grounded web retrieval, TTS, and voice
streaming require an outside AI service and device permissions.

## Apps it serves

AI chat assistants (ChatGPT, Claude, Google Gemini, Microsoft Copilot, Grok), cited AI answer engines
(Perplexity, Google AI Overview), homework/study copilots (Gauth AI), and voice-first AI companions.

## What the core already covers

- Human-to-human 1:1 messages: `Bubbles` and `Composer[reply]`; simple keyword filtering: `Search` and
  `Chips`.
- Static long-form articles or essays without streaming turns or code copy blocks: `Article`; simple
  reference documents attached to a screen: `FileList`.
- Short helper instructions: `Note`; rating or feedback surveys: `Scale` and `Composer[entry]`; generic
  navigation shortcuts: `Actions`.
- Guided step-by-step onboarding flows: `Steps`; plain quiz questions with fixed right/wrong keys:
  `Choice` (or `learning/Quiz`).

`AiThread` stays for multi-turn AI responses containing inline numbered citations, copyable `KitCodeBlock`
fences, streaming token cursors, and regenerate/TTS/feedback controls rather than `Bubbles` or static
`Article`. `PromptComposer` stays for model/reasoning mode switching (`Fast`, `Think`, `Research`),
multi-modal attachments, and active stop-generation toggling, distinct from `Composer[reply]`.
`PromptStarters` scaffolds blank AI landing screens; `CitationCards` pairs verified source snippets with
follow-up chips; `ToolStep` exposes live connector runs (`running`/`done`/`error`); `ArtifactCard`
frames versioned editable deliverables; `VoiceOrb` runs real-time radial speech sessions (unlike paced
`mind/Breathe` or pronunciation drills in `learning/SpeechCheck`); and `ChatArchive` manages pinned and
dated AI threads separately from email/messaging (`comms/Inbox`) or cloud drives (`workspace/DriveTree`).
These packs are neighbours, never dependencies.

## Components (8)

### `AiThread` · planned · content · service
A multi-turn AI conversation pairing user prompts with rich assistant replies. Responses render headings,
lists, inline numbered citation pills (`[1]`), syntax-highlighted `KitCodeBlock` panels with one-tap copy,
and a live streaming cursor while generating. Each assistant turn carries copy, regenerate, read-aloud TTS,
and thumbs feedback actions.
- Pick: rendering multi-turn conversational AI answers with code blocks, inline citations, and streaming
  states. Not human chat (`Bubbles`, `comms/Inbox`), static reading (`Article`), or team channels
  (`comms/ChannelFeed`).
- Writes: `turns` of `id` text(24), `role` (`user`, `assistant`), `model` text(20) optional, `text`
  text(2000), `codeBlocks` of `language` text(16), `code` text(1200), 0–3, `citations` of `index` int
  1–9, `label` text(24), `goto` optional, 0–6, `streaming` boolean (default false), `feedback` (`none`,
  `up`, `down`) (default `none`), `speaking` boolean (default false), 1–16; `style`. Code renders
  inline citation badges and disables regenerate on user turns.
- Styles: `turns` (default, full assistant prose and code cards), `compact` (tighter spacing for narrow
  follow-up panels).
- Parts → actions: `turns copy copy`, `code copy copy` (`KitCodeBlock` copy trigger), `citations root
  press` (scrolls or opens `CitationCards`), `turns regenerate press`, `turns speak play`, `turns speak
  pause`, `turns feedback select` (`up` or `down`).
- States: filled, empty, loading (streaming token cursor / skeleton turn), error (stream interrupted with
  retry).
- Real path: conversation turns streamed from an external AI completion service; TTS playback and citation
  jumps run through host media and navigation handlers.
- Density: `meta.dense: true`, weight 3; multi-turn AI threads hold up to 16 turns containing prose,
  numbered citations, and multi-line code blocks.

### `PromptComposer` · planned · input · service
A docked AI prompting bar with a growing multiline input box and a model or reasoning-mode pill (`Fast`,
`Think`, `Research`). File, photo, and `KitMicCapture` voice triggers attach context as preview chips
above the box. The send trigger toggles to a Stop button while the assistant streams tokens.
- Pick: composing AI prompts with model/reasoning modes, multimodal attachments, voice input, and
  stop-generation controls. Not replying in human chat (`Composer[reply]`) or searching records (`Search`).
- Writes: `hint` text(60) optional, `value` text(2000) optional, `modes` of `id` text(16), `label`
  text(16), 2–4, `modeAt` index (default 0), `attachments` of `label` text(24), `kind` (`file`, `photo`,
  `audio`), 0–4, `generating` boolean (default false); `style`. Send disables when both `value` and
  `attachments` are empty unless `generating` is true.
- Styles: `dock` (default, bottom-anchored composer with mode pill and attachment row), `compact`
  (single-row prompt bar expanding on focus).
- Parts → actions: `field type`, `mode select`, `attach press`, `photo press`, `voice start`,
  `voice stop`, `send send`, `stop stop`.
  `meta.partTiers: { attach: "ok", photo: "ok", voice: "ok" }`.
- States: filled, empty, loading (awaiting initial token), error (upload or prompt failed; draft kept).
- Real path: prompts send to an AI inference service; local file, photo, and `KitMicCapture` audio inputs
  request device permissions (`!needs-ok`) before upload.

### `PromptStarters` · planned · action · phone
Two to six categorized prompt suggestion cards shown on a fresh assistant screen. Each card pairs an icon
and category label with a short headline and example prompt preview. Tapping any starter pre-fills
`PromptComposer` or launches the conversation turn.
- Pick: offering curated starter prompts on an empty AI workspace or new-chat screen. Not general app
  navigation tiles (`Actions`), multi-sentence plan cards (`Choice`), or saved conversation history
  (`ChatArchive`).
- Writes: `items` of `id` text(24), `category` text(16), `title` text(32), `prompt` text(120), `icon`
  optional, `goto` optional, 2–6; `style`.
- Styles: `cards` (default, 2-column or stacked starter cards), `list` (compact single-line suggestions).
- Parts → actions: `items root press`.
- States: filled, empty, loading.
- Real path: starter prompt presets bundled with the app or fetched from the workspace prompt library;
  tapping fills the local draft or triggers a new turn.

### `CitationCards` · planned · content · service
A horizontal source rail or vertical bibliography of grounded web and workspace references. Each card
displays a favicon or source icon, domain or path, title, excerpt snippet, and date, paired with related
follow-up prompt chips. Tapping a source opens it while tapping a follow-up submits the next query.
- Pick: inspecting cited web or workspace sources and follow-up queries attached to an AI response. Not
  saved reading highlights (`media/Highlights`), generic file attachments (`FileList`), or news topic
  clusters (`news`).
- Writes: `sources` of `id` text(24), `index` int 1–9, `title` text(48), `domain` text(32), `snippet`
  text(140) optional, `date` text(16) optional, `icon` optional, `url` text(160) optional, `goto`
  optional, 1–6; `followups` text(60) each 0–4; `style`.
- Styles: `rail` (default, sideways source cards above follow-up chips), `list` (full vertical source cards
  with multi-line snippets).
- Parts → actions: `sources root press` (opens `goto` or source preview), `followups root press`
  (populates or submits the follow-up query).
- States: filled, empty, loading, error (sources unavailable).
- Real path: grounded source metadata returned alongside an AI search/RAG service response; opening
  external links passes through the host link viewer.

### `ToolStep` · planned · data · service
A collapsible AI connector and tool execution trace (`"Searched Drive · Found 3 files"`). Each row shows
the tool icon, action summary, live running, done, or error badge, and elapsed duration. Expanding a step
reveals its structured query inputs and retrieved item summary.
- Pick: surfacing transparent AI tool, search, or connector steps during or after generation. Not user
  wizard indicators (`Steps`), project milestone gates (`projects/Milestones`), or system audit logs
  (`data/ActivityLog`).
- Writes: `steps` of `id` text(24), `tool` text(24), `summary` text(48), `status` (`running`, `done`,
  `error`), `elapsed` text(10) optional, `detail` text(160) optional, `resultCount` int ≥ 0 optional,
  `expanded` boolean (default false), `goto` optional, 1–6; `style`.
- Styles: `timeline` (default, stacked collapsible tool steps), `pill` (single compact status bar that
  expands into step rows).
- Parts → actions: `steps root toggle` (expand or collapse step trace), `results root press` (opens
  linked `goto` when supplied).
- States: filled, loading (step actively executing), success (all tools completed), error (tool call
  failed with diagnostic summary).
- Real path: real-time tool-call telemetry emitted by the AI agent runtime; collapsed/expanded disclosure
  state stays local on the device.

### `ArtifactCard` · planned · content · service
A focused preview and inspector for an AI-generated deliverable such as a draft, code module, table, or
summary. It displays the deliverable kind badge, title, version switcher (`v1`, `v2`), and formatted
content or `KitCodeBlock` preview. Copy, Export, and Refine actions iterate on or share the output.
- Pick: inspecting, versioning, copying, exporting, or requesting revisions on an AI-created deliverable.
  Not reading a static editorial article (`Article`), billing documents (`customers/Invoice`), or browsing
  cloud folders (`workspace/DriveTree`).
- Writes: `id` text(24), `title` text(48), `kind` (`document`, `code`, `table`, `summary`), `language`
  text(16) optional (when `code`), `version` int ≥ 1 (default 1), `versions` int ≥ 1 (default 1),
  `content` text(2000), `refineGoto` optional, `style`. Code disables version switching when `versions`
  equals `1`.
- Styles: `preview` (default, compact card inside or beside a thread), `expanded` (full deliverable
  reading and code-inspection view).
- Parts → actions: `root press` (opens expanded view), `copy copy`, `export press`, `refine press`
  (focuses `PromptComposer` or opens `refineGoto`), `version select`.
  `meta.partTiers: { export: "service" }`.
- States: filled, loading (drafting artifact), success (exported/copied), error (render or export failed).
- Real path: generated deliverable stored with the session on the AI workspace service; copy writes to the
  device clipboard and export invokes the host share sheet.

### `VoiceOrb` · planned · action · ok
A hands-free live AI voice session anchored by an animated `KitVoiceOrb` radial state indicator. The orb
shifts visibly across idle, listening, thinking, and speaking phases above a live rolling transcript
caption. Mute, optional camera-context, and End controls manage the session cleanly.
- Pick: running a real-time conversational voice mode with an AI assistant. Not paced breathing timers
  (`mind/Breathe`), speech pronunciation scoring (`learning/SpeechCheck`), or multi-party human calls
  (`comms/ActiveCall`).
- Writes: `persona` text(24), `phase` (`idle`, `listening`, `thinking`, `speaking`), `caption` text(160)
  optional, `muted` boolean (default false), `cameraOn` boolean (default false), `elapsed` text(10)
  optional; `style`. Live audio level, phase transitions, and rolling caption updates come from the
  host audio/stream runtime.
- Styles: `orb` (default, centred `KitVoiceOrb` with concise caption), `caption` (larger multi-line live
  transcript with compact orb header).
- Parts → actions: `orb toggle` (interrupt speech or pause/resume listening), `mute toggle`,
  `camera toggle`, `end press`.
  `meta.partTiers: { orb: "service", camera: "ok" }`.
- States: filled, loading (connecting voice stream), error (mic permission denied or stream lost).
- Real path: live voice capture requires microphone permission (`ok`), optional visual context uses camera
  permission (`!needs-ok`), and real-time audio/ASR streaming connects to an external AI voice service.

### `ChatArchive` · planned · content · phone
A saved AI conversation archive bucketed into Pinned, Today, Last 7 Days, and Older sections. Each row
displays the thread title, model or project tag, and last active date. Row controls open, pin, rename, or
confirm-delete past sessions.
- Pick: browsing, pinning, renaming, or deleting saved AI conversations. Not messaging/email inboxes
  (`comms/Inbox`) or hierarchical cloud files (`workspace/DriveTree`).
- Writes: `threads` of `id` text(24), `title` text(40), `tag` text(16) optional (model or project),
  `date`, `bucket` (`pinned`, `today`, `week`, `older`), `messageCount` int ≥ 1 optional, `goto`
  optional, 1–6; `style`. Code sorts threads into date buckets and presents overflow counts with shared
  "and N more" copy.
- Styles: `grouped` (default, date-bucket headings), `compact` (flat chronological rows).
- Parts → actions: `threads root press`, `threads pin toggle`, `threads rename press`,
  `threads delete press`.
  `meta.confirmParts: ["delete"]`.
- States: filled, empty, loading, error (history unavailable).
- Real path: saved session metadata cached locally on the device and synced when an AI workspace account
  is connected.

## Archetypes (3)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `ai_chat` | Multi-turn AI chat and artifact inspection | `assistant_turn`, `assistant_artifact` | `assistant_turn`: Header, AiThread, ToolStep, PromptComposer · `assistant_artifact`: Header[back], ArtifactCard, Note, PromptComposer |
| `ai_search` | Grounded AI answers and cited sources | `assistant_cited`, `assistant_sources` | `assistant_cited`: Header, Search, AiThread, CitationCards · `assistant_sources`: Header[back], CitationCards[list], Note, Button |
| `ai_prompts` | Starter prompts, voice mode and history | `assistant_explore`, `assistant_voice`, `assistant_archive` | `assistant_explore`: Header, PromptStarters, Chips, PromptComposer · `assistant_voice`: Header[back], VoiceOrb, Note · `assistant_archive`: Header, Search, Chips, ChatArchive, Button |

The first listed layout is each archetype's `defaultLayout`; all layout ids are `assistant_`-prefixed and
unique across the catalog. Recipes use only core components plus `assistant` pack components, contain at
most one dense component (`AiThread`) per layout, and stay within plan 4.5's screen weight limit (4–8).
`PromptComposer` owns send/stop on `assistant_turn`, `assistant_artifact`, and `assistant_explore`, so no
competing primary `Button` is placed beside it.

## Worked example: Beacon

An AI research and drafting companion built with `assistant`. A new user opens `ai_prompts/assistant_explore`
and taps a `"Compare battery specs"` starter in `PromptStarters`, jumping to `ai_chat/assistant_turn`.
`ToolStep` collapses cleanly after showing `"Searched 4 technical briefs"`, `AiThread` streams a structured
markdown comparison with `[1]`/`[2]` citation pills and a copyable `KitCodeBlock` JSON summary, and
`ArtifactCard` on `assistant_artifact` renders the exportable `v1` specification table. Switching to
`ai_search/assistant_cited` exposes `CitationCards` with follow-up prompt chips; hands-free commuting
uses `ai_prompts/assistant_voice` with `VoiceOrb`, and past sessions live in `assistant_archive`.
Signature: `count_up` on an optional core `Stats` summary of cited sources; no new signature proposed.

## Tiers

`PromptStarters` and `ChatArchive` work locally on the phone (`phone`). `VoiceOrb` defaults to `ok` for
microphone capture (with `orb` streaming marked `!needs-service` and `camera` marked `!needs-ok`).
`AiThread`, `PromptComposer`, `CitationCards`, `ToolStep`, and `ArtifactCard` require an external AI
inference/search service (`service`), with local attachment and `KitMicCapture` inputs on `PromptComposer`
marked `!needs-ok`.

## Build notes

- Order: `PromptStarters`, `ChatArchive`, `PromptComposer` (after `KitMicCapture`), `ToolStep`,
  `CitationCards`, `AiThread` (after `KitCodeBlock`), `ArtifactCard`, `VoiceOrb` (after `KitVoiceOrb`);
  all remain planned.
- New kit bases required ahead of components: `KitCodeBlock` (`AiThread`, `ArtifactCard`), `KitMicCapture`
  (`PromptComposer`), and `KitVoiceOrb` (`VoiceOrb`).
- Strict `writerFormat(registry)` admits only core plus chosen packs; no aliases or off-pack fallbacks.
  Each component ships two examples, choose/write/read probes, kit-only renderers, and a pack
  `example.jsonl` validated in three presets.
- `AiThread` uses a bounded markdown subset parsed into kit text roles and `KitCodeBlock` — never raw
  HTML or arbitrary scripts.
- `ChatArchive.delete` declares `meta.confirmParts: ["delete"]` and routes through shared confirmation;
  `AiThread` is the pack's sole `meta.dense: true` (weight 3) component.

## Open questions

- **New action names?** None. Copying uses `copy`; voice capture and generation stop use `start`/`stop`;
  TTS playback uses `play`/`pause`; prompt sending uses `send`.
- **VoiceOrb signature?** Default: keep existing core signatures (for example `count_up`) on an overview
  screen; propose a dedicated `voice_pulse` signature on `VoiceOrb` only after a reference mock is built.
- **Workspace document grounding?** Combining `assistant` + `workspace` lets `CitationCards` and `ToolStep`
  link to cloud docs without creating a pack dependency between them.
