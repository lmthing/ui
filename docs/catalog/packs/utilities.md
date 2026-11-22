# `utilities` pack

**Status:** planned · **Wave:** 6 · **Pick line:** Everyday device tools: calculators, offline unit converters, translators, QR studios, network speed tests and local file explorers. Not security/VPN (`security`), trip FX only (`trips`), or AI chat (`assistant`).

## Purpose

Everyday phone-side utility tools: standard and scientific expression calculators, offline physical and
digital unit converters, split-pane and dual-mic language translators, QR/barcode generators and decoded
scan inspection, live network bandwidth and latency gauges, and local device file explorers with a locked
Safe Folder. Calculations, unit conversions, QR encoding, and local folder browsing work offline on the
device; translation APIs, camera scanning, and bandwidth measurements depend on host permissions and
external services. Privileged OS system cleaners, custom IME keyboards, and live AR OCR overlays remain in
`Canvas` / native adapters.

## Apps it serves

Device toolkits and suites (Google/Samsung Calculator, Google Translate, DeepL, QR & Barcode Scanner,
Speedtest by Ookla, Files by Google, PDF Reader utilities).

## What the core already covers

- Pointing the camera at a QR code or barcode right now: `Camera[scan]` on `ok` tier; counting simple
  tallies: `Counter`; countdown or stopwatch clocks: `Timer`.
- Searching and filtering a small local list: `Search` and `Chips`; viewing one decoded key-value summary:
  `KeyValue`; attaching 1–6 non-image files to a form or thread: `FileList`.
- Entering a single payment amount without operators: `Field[number]` (or `money/AmountPad` when `money`
  is loaded); live travel currency exchange rates: `trips/Converter`.
- Encrypted password vaults, 2FA authenticators, and VPN toggles: `security`.

`Calculator` stays for multi-token arithmetic/scientific expressions, operator precedence, and scrollable
history tape over `KitCalcPad`, distinct from `money/AmountPad` and step-by-step math explanations
(`learning/WorkedSolution`). `UnitConverter` handles offline physical and digital units (`length`, `mass`,
`volume`, `temp`, `speed`, `data`, `area`, `time`) with a multi-unit reference matrix rather than trip FX
(`trips/Converter`). `Translator` pairs two-language split panes, transliteration, TTS, and `KitMicCapture`
dual-mic conversation mode; `QrStudio` generates payloads with `KitCode` and maps decoded scans to smart
actions (unlike event `events/Ticket` or membership `PassCard`); `SpeedGauge` measures live Mbps and ping
over `KitDialGauge` (not static goals in `Ring` or tunnels in `security/VpnTunnel`); and `FileBrowser`
navigates local phone storage separately from cloud drives (`workspace/DriveTree`) and private IDs
(`paperwork/Documents`). These packs are neighbours, never dependencies.

## Components (6)

### `Calculator` · planned · input · phone
An arithmetic and scientific calculator built over `KitCalcPad` with a multi-token expression display and
live evaluated output. A scrollable history tape retains recent calculations for one-tap reuse, while
scientific mode adds trig, log, root, power, and degree/radian controls. Deterministic parsing updates
results on every keystroke.
- Pick: evaluating arithmetic or scientific math expressions with operators and a calculation history
  tape. Not entering a currency payment (`money/AmountPad`), teaching step-by-step solutions
  (`learning/WorkedSolution`), or converting units (`UnitConverter`).
- Writes: `expression` text(80) optional, `angleUnit` (`deg` default, `rad`), `history` of `expr`
  text(48), `result` text(24), 0–12; `style`. Code deterministically parses and evaluates `expression` and
  `history` entries (no model-written evaluated answers or `eval` strings).
- Styles: `standard` (default, 4-column arithmetic keypad + history toggle), `scientific` (adds scientific
  functions and angle-unit pill).
- Parts → actions: `keys type` (digits, operators, functions, backspace), `clear press`, `equals press`,
  `angle toggle` (`deg` / `rad`), `history root press` (re-inserts saved value), `copy copy`.
- States: filled, empty (zero / blank expression), error (syntax error or division by zero).
- Real path: deterministic math expression evaluator running locally on the device; calculation history
  persists in local storage.
- Density: `meta.dense: true`, weight 3; scientific function keys paired with a multi-entry calculation
  tape require dense layout density.

### `UnitConverter` · planned · input · phone
An offline physical and digital measurement converter grouped by category chips (`length`, `mass`,
`volume`, `temp`, `speed`, `data`, `area`, `time`). Paired unit pickers, a Swap button, and a numeric
entry convert values live without network access. A multi-unit matrix mode compares every unit in the
category simultaneously.
- Pick: converting physical, thermal, digital, or time measurements offline. Not live foreign-currency
  exchange (`trips/Converter`) or general expression math (`Calculator`).
- Writes: `category` (`length` default, `mass`, `volume`, `temp`, `speed`, `data`, `area`, `time`),
  `fromUnit` text(12), `toUnit` text(12), `value` number (default `1`); `style`. Code supplies unit lists
  per category and computes all converted output numbers and reference equivalents offline.
- Styles: `paired` (default, source/target fields + top equivalents), `matrix` (all units in the chosen
  category updated live together).
- Parts → actions: `category select`, `fromUnit select`, `toUnit select`, `value set`, `swap press`,
  `copy copy`.
- States: filled, empty, error (unsupported unit or out-of-range temperature below absolute zero).
- Real path: exact conversion constants and affine temperature formulas built into the package; runs
  fully offline on the device.

### `Translator` · planned · input · service
A split-pane language translator with source and target language selectors, auto-detect, and a Swap
languages trigger. Users type, capture speech via `KitMicCapture`, or launch camera OCR to inspect
translated text with phonetic transliteration and TTS playback. Conversation style flips into dual-mic
facing panes for live dialogue.
- Pick: translating text, voice, or camera-captured text between two languages. Not language courses
  (`learning/Lesson`) or pronunciation grading (`learning/SpeechCheck`).
- Writes: `sourceLang` text(16), `targetLang` text(16), `sourceText` text(400) optional, `translatedText`
  text(400) optional, `transliteration` text(240) optional, `starred` boolean (default false), `exchanges`
  of `speaker` (`a`, `b`), `source` text(160), `target` text(160), 0–6 (`conversation` only); `cameraGoto`
  optional; `style`.
- Styles: `text` (default, stacked source and translated panes), `conversation` (split dual-mic panes for
  live back-and-forth speech).
- Parts → actions: `sourceLang select`, `targetLang select`, `swap press`, `source type`, `mic start`,
  `mic stop`, `camera press` (`cameraGoto`), `speak play`, `speak pause`, `copy copy`, `star toggle`.
  `meta.partTiers: { mic: "ok", camera: "ok" }`.
- States: filled, empty, loading (translating), error (translation service offline or language unavailable).
- Real path: translation, speech recognition, and TTS run through an external translation service (or
  downloaded offline language packs); `KitMicCapture` and camera launch require device permissions (`!needs-ok`).

### `QrStudio` · planned · content · phone
A general-purpose QR and barcode generator paired with a decoded payload inspector. In `create` mode it
encodes URLs, Wi-Fi credentials, contacts, emails, or text into `KitCode`; in `decoded` mode it surfaces
type-aware smart actions like Open link or Connect Wi-Fi alongside scan history. History rows reopen or
confirm-remove saved codes.
- Pick: generating custom QR/barcodes or acting on decoded general-purpose scan results. Not event tickets
  (`events/Ticket`), travel boarding passes (`trips/Reservation`), or loyalty barcodes (`PassCard`).
- Writes: `kind` (`url` default, `wifi`, `contact`, `text`, `email`), `payload` text(240), `label`
  text(32) optional, `history` of `id` text(24), `kind` (`url`, `wifi`, `contact`, `text`, `email`),
  `label` text(32), `payload` text(240), `at` text(16), 0–6; `style`. Code parses `kind` and validates
  payload formatting before encoding `KitCode` or proposing smart actions; overflow history uses "and N more".
- Styles: `create` (default, payload type chips, form input, and generated `KitCode`), `decoded` (parsed
  payload card, smart actions, and scan history).
- Parts → actions: `kind select`, `payload type`, `scan scan`, `action press`, `copy copy`, `share press`,
  `history root press`, `history remove press`.
  `meta.confirmParts: ["remove"]`; `meta.partTiers: { scan: "ok", action: "service", share: "service" }`.
- States: filled, empty, error (unparseable or oversized QR payload).
- Real path: `KitCode` renders payloads deterministically on the device; scanning uses `Camera` permission
  (`!needs-ok`), while opening URLs or sharing invokes external services (`!needs-service`).

### `SpeedGauge` · planned · data · service
A live network bandwidth and latency diagnostic featuring a `KitDialGauge` radial speedometer. During a
run it steps through ping, download, and upload phases while reporting Mbps, ping, jitter, and
packet-loss metrics. Users can switch test servers, start or stop tests, and inspect past run summaries.
- Pick: running and inspecting live network speed and latency tests. Not displaying a static goal (`Ring`)
  or toggling an encrypted tunnel (`security/VpnTunnel`).
- Writes: `server` text(32), `servers` of `id` text(24), `name` text(32), `distance` text(12), 1–6,
  `phase` (`idle`, `ping`, `download`, `upload`, `complete`), `downloadMbps` number ≥ 0 optional,
  `uploadMbps` number ≥ 0 optional, `pingMs` number ≥ 0 optional, `jitterMs` number ≥ 0 optional,
  `lossPct` number 0–100 optional, `runs` of `date` text(16), `downloadMbps` number ≥ 0, `uploadMbps`
  number ≥ 0, `pingMs` number ≥ 0, 0–6; `style`. Live throughput and latency values come from the host
  network test engine, never fabricated while idle.
- Styles: `dial` (default, live speedometer `KitDialGauge` + telemetry grid), `history` (compact gauge
  paired with recent speed-test runs).
- Parts → actions: `server select`, `test start`, `test stop`, `history root press`.
- States: filled, empty (ready to test), loading (active test phase running), error (no network or server
  unreachable).
- Real path: measures HTTP/socket throughput and round-trip latency against a speed-test server service;
  past run results are stored locally on the device.

### `FileBrowser` · planned · content · phone
A local device storage explorer with path breadcrumbs, file-category filter chips, and list or grid
layouts. Entries display file-type icons, formatted byte sizes, and modified timestamps alongside sort
controls and a locked Safe Folder shortcut. Row actions open, share, rename, move to Safe Folder, or
confirm-delete local files.
- Pick: browsing, sorting, locking, or deleting local device folders and storage files. Not shared team
  cloud drives (`workspace/DriveTree`), personal IDs and expiry alerts (`paperwork/Documents`), physical
  boxes (`inventory/Storage`), or 1–6 form attachments (`FileList`).
- Writes: `breadcrumbs` of `id` text(24), `label` text(20), 1–5, `items` of `id` text(24), `name`
  text(36), `kind` (`folder`, `pdf`, `doc`, `image`, `audio`, `video`, `apk`, `archive`, `other`),
  `bytes` int ≥ 0 optional (omitted on folders), `modified` text(12), `inSafe` boolean (default false),
  `goto` optional, 0–24; `sortBy` (`name`, `date`, `size`) (default `name`); `safeLocked` boolean
  (default true); `style`. Code formats byte units (`KB`, `MB`, `GB`) and groups folders first.
- Styles: `list` (default, dense rows with size and date), `grid` (two-column file tiles).
- Parts → actions: `breadcrumbs root press`, `items root press`, `items share press`, `items rename press`,
  `items moveSafe press`, `items delete press`, `sort select`, `safeFolder press`.
  `meta.confirmParts: ["delete"]`; `meta.partTiers: { share: "service", moveSafe: "ok", safeFolder: "ok" }`.
- States: filled, empty (empty folder), loading, error (storage permission denied or file missing).
- Real path: reads local device directories and moves files into an encrypted Safe Folder gated by local
  device authentication (`!needs-ok`); deleting permanently removes the local file after confirmation.
- Density: `meta.dense: true`, weight 3; device directories show up to 24 files and subfolders per view.

## Archetypes (4)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `util_calc` | Arithmetic, scientific math and offline units | `utilities_standard`, `utilities_units` | `utilities_standard`: Header, Segmented, Calculator · `utilities_units`: Header, Segmented, UnitConverter, Note |
| `util_translate` | Live translation and saved phrasebook | `utilities_text`, `utilities_phrases` | `utilities_text`: Header, Translator, Note · `utilities_phrases`: Header, Search, Chips, List, Button |
| `util_scan` | Scan and generate QR or barcodes | `utilities_scan`, `utilities_create` | `utilities_scan`: Header, Camera[scan], QrStudio[decoded] · `utilities_create`: Header, QrStudio[create], Note, Button |
| `util_system` | Network speed tests and local storage | `utilities_speed`, `utilities_files` | `utilities_speed`: Header, SpeedGauge, KeyValue, Note · `utilities_files`: Header, Search, Chips, FileBrowser |

The first listed layout is each archetype's `defaultLayout`; every layout id is `utilities_`-prefixed and
unique across the catalog. Recipes use only core components plus `utilities` pack components, keep at
most one dense component (`Calculator` or `FileBrowser`) per layout, and stay within screen weights 4–6.
`Calculator` owns calculation controls on `utilities_standard`, and `Camera[scan]` pairs with
`QrStudio[decoded]` on `utilities_scan`.

## Worked example: Pocket Bench

An offline-first mobile utility kit built with `utilities`. In the workshop, `util_calc/utilities_standard`
uses `Calculator` in `scientific` mode to compute cable load formulas and keep the expression tape, while
`utilities_units` switches `Segmented` to `UnitConverter` to convert millimetres, inches, and AWG/metric
equivalents offline. On site, `util_scan/utilities_scan` scans a router label via `Camera[scan]` into
`QrStudio[decoded]` with a `"Connect Wi-Fi"` action, and `utilities_create` generates a guest Wi-Fi QR
code via `KitCode`. Back at the desk, `util_translate/utilities_text` translates an appliance manual note
with `Translator`, and `util_system/utilities_speed` runs `SpeedGauge` before inspecting downloaded PDFs
in `FileBrowser`. Signature: `count_up` on an optional core `Stats` storage summary; no new signature.

## Tiers

`Calculator`, `UnitConverter`, `QrStudio[create]`, and `FileBrowser` work on the phone (`phone`), with
`QrStudio.scan`, Safe Folder locks, and `Translator` mic/camera inputs marked `!needs-ok`, and sharing or
opening external URLs marked `!needs-service`. `Translator` and `SpeedGauge` require external network
services (`service`).

## Build notes

- Order: `UnitConverter`, `FileBrowser`, `QrStudio`, `Calculator` (after `KitCalcPad`), `Translator`
  (after `KitMicCapture`), `SpeedGauge` (after `KitDialGauge`); all remain planned.
- New kit bases required ahead of components: `KitCalcPad` (`Calculator`), `KitMicCapture`
  (`Translator`), and `KitDialGauge` (`SpeedGauge`). `QrStudio` reuses existing `KitCode`.
- Strict `writerFormat(registry)` admits only core plus chosen packs; no aliases or off-pack fallbacks.
  Each component ships two examples, choose/write/read probes, kit-only renderers, and a pack
  `example.jsonl` rendered in three presets.
- `Calculator` and `FileBrowser` declare `meta.dense: true` (weight 3); `QrStudio` history and
  `SpeedGauge` run lists cap at six items with shared "and N more" copy.
- Destructive removals (`QrStudio.remove`, `FileBrowser.delete`) declare `meta.confirmParts` and route
  through shared confirmation; `Calculator` evaluates expressions deterministically in code without `eval`.

## Open questions

- **New action names?** None. Copy uses `copy`; QR scanning uses `scan`; voice/speed test start and stop
  use `start`/`stop`; TTS uses `play`/`pause`; unit amounts use `set`.
- **OS storage cache cleaners & custom keyboards?** Out of scope; privileged Android storage-cleaner
  daemons and custom IME keyboards remain outside `PhoneScreen` (`Canvas` / OS host).
- **Combining with `security` or `trips`?** Optional Director combinations pair `utilities + security`
  for full device suites or `utilities + trips` for offline unit conversion + live trip FX.
