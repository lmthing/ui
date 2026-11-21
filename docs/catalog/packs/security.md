# `security` pack

**Status:** planned · **Wave:** 6 · **Pick line:** Protecting accounts and connections: 2FA TOTP codes, MFA push approvals, credential vaults, password generators, recovery codes, VPN tunnels and audits. Not life-admin PDFs (`paperwork`), not utilities (`utilities`).

## Purpose

Account, credential, and connection protection: synchronized 30-second 2FA TOTP authenticators, incoming
MFA push and number-match challenges, encrypted password and passkey vaults (with biometric or
`KitNumberPad` PIN gating), high-entropy password and passphrase generators, one-time MFA recovery code
registers, encrypted VPN tunnel controls, credential security hygiene audits, and enterprise device trust
posture checks. Default showcases seed masked synthetic records (`secret`); live TOTP seed imports, MFA
push channels, breach lookups, and WireGuard/OpenVPN tunnels require device permissions or outside
services. Biometric liveness OCR and kernel-level network drivers remain outside `PhoneScreen`.

## Apps it serves

2FA authenticators and enterprise MFA (Google Authenticator, Microsoft Authenticator, Duo Mobile), password
managers and passkey vaults (1Password, Bitwarden, Proton Pass), and consumer VPN/security suites
(Proton VPN, NordVPN, Norton 360).

## What the core already covers

- Scanning an `otpauth://` QR code to enroll a token: `Camera[scan]` on `ok` tier; guided setup steps:
  `Steps`; urgent security warnings: `Banner`.
- Viewing masked key-value facts on one detail screen: `KeyValue[masked]`; searching or filtering items:
  `Search` and `Chips`; short explanatory notes: `Note`.
- Private life-admin PDFs, passports, and policy expiry dates: `paperwork/Documents`; travel identity
  records: `trips/TravelDocs`; local file utilities and Safe Folders: `utilities/FileBrowser`.
- Manager approvals for staff leave or expenses: `team/Approval`; confirmation sheets on destructive
  presses: `Button[danger]` or `meta.confirmParts`.

`AuthTokens` stays for live 30s rotating TOTP codes with `KitRadialTrack` countdown arcs, tap-to-copy,
and mask toggles rather than static `KeyValue[masked]` rows. `PushChallenge` handles real-time MFA sign-in
prompts and 2-digit number matching; `CredentialVault` protects logins, passkeys, cards, and API/SSH keys
behind a biometric or `KitNumberPad` PIN gate with breach and linked-2FA badges; `PasswordGen` pairs
CSPRNG password/passphrase generation with live entropy scoring; `RecoveryCodes` tracks one-time used
codes and confirmed regeneration; `VpnTunnel` controls encrypted tunnels, exit countries, kill-switch, and
throughput sparklines (unlike bandwidth testing in `utilities/SpeedGauge`); `SecurityAudit` computes vault
hygiene scores and links directly to remediations; and `DeviceTrust` verifies OS/MDM security compliance.
These packs are neighbours, never dependencies.

## Components (8)

### `AuthTokens` · planned · data · phone
Live 2FA TOTP authenticator rows displaying each service's issuer icon, account label, and spaced 6- or
8-digit code. A synchronized 30-second `KitRadialTrack` ring counts down until the next rotation alongside
tap-to-copy and mask toggles. Optional scan and encrypted backup sync controls keep tokens portable.
- Pick: displaying live rotating 30-second TOTP 2FA codes. Not storing static passwords or passkeys
  (`CredentialVault`), one-time backup codes (`RecoveryCodes`), or social invite codes (`social/Invite`).
- Writes: `entries` of `id` text(24), `issuer` text(28), `account` text(36), `digits` (`6` default, `8`),
  `period` (`30` default, `60`), `masked` boolean (default false), `seed` secret(64) optional, `synced`
  boolean (default false), 1–6; `addGoto` optional; `style`. Code computes rotating 6/8-digit tokens and
  remaining seconds from stored seeds and clock (reads expose `(secret)` for seeds); overflows beyond six
  use shared "and N more" copy.
- Styles: `tokens` (default, spaced live codes with countdown rings), `masked` (dots until tapped to
  reveal).
- Parts → actions: `entries root press` (reveal/copy), `entries copy copy`, `entries reveal toggle`,
  `entries remove press`, `addScan scan` (`addGoto`), `sync press`.
  `meta.confirmParts: ["remove"]`; `meta.partTiers: { addScan: "ok", sync: "service" }`.
- States: filled, empty, loading, error (clock drift or sync failed).
- Real path: RFC 6238 TOTP tokens computed locally from device-stored `secret` seeds; QR scanning needs
  camera permission (`!needs-ok`), and encrypted backup sync needs an external account service (`!needs-service`).

### `PushChallenge` · planned · action · service
An incoming MFA sign-in prompt showing the requesting app, account, location, IP summary, device, and
timestamp. In `number_match` mode the user selects the matching two-digit code displayed on the login
screen before Approve activates. Approve confirms the session while Deny rejects and flags the attempt.
- Pick: approving or denying a live MFA push authentication challenge (with optional number matching).
  Not staff leave approvals (`team/Approval`), document sharing (`workspace/ShareAccess`), or generic form
  buttons (`Button`).
- Writes: `id` text(24), `app` text(32), `account` text(36), `location` text(36), `device` text(32), `ip`
  text(24) optional, `requestedAt` text(16), `numbers` text(4) each 0–3 (`number_match` only),
  `selectedAt` index optional, `expiresAt` ISO datetime with offset optional; `style`. In
  `number_match`, `approve` stays disabled until a number is picked and verified by the auth service.
- Styles: `prompt` (default, one-tap Approve / Deny), `number_match` (requires picking the matching
  number shown on the sign-in screen).
- Parts → actions: `numbers root select` (`number_match` only), `approve press`, `deny press`.
  `meta.confirmParts: ["deny"]`.
- States: filled, empty (no pending MFA request), loading (verifying response), success (approved or
  denied), error (challenge expired or network unreachable).
- Real path: push challenges arrive over a real-time MFA notification service; approving or denying sends
  a cryptographically signed response from the device key.

### `CredentialVault` · planned · content · phone
A searchable credential vault for logins, passkeys, payment cards, and API or SSH keys. Locked mode gates
access behind OS biometrics or a `KitNumberPad` PIN pad, while unlocked rows display linked 2FA badges,
breach alerts, reveal toggles, and one-tap copy controls. All secrets remain masked in reads.
- Pick: storing, unlocking, and copying masked logins, passkeys, payment cards, and API/SSH keys. Not
  live rotating 2FA codes (`AuthTokens`), backup recovery lists (`RecoveryCodes`), personal PDFs
  (`paperwork/Documents`), or travel IDs (`trips/TravelDocs`).
- Writes: `locked` boolean (default false), `pinLength` int 4–8 (default 6, `locked` only), `items` of
  `id` text(24), `kind` (`login`, `passkey`, `card`, `key`), `title` text(32), `username` text(40),
  `secret` secret(120), `has2fa` boolean (default false), `breached` boolean (default false), `reused`
  boolean (default false), `goto` optional, 0–24; `style`. Secrets read back strictly as `(secret)`, and
  all vault entries remain hidden while `locked` is true.
- Styles: `vault` (default, unlocked searchable entries with copy/reveal actions), `locked` (PIN keypad
  via `KitNumberPad` and biometric prompt gating entry access).
- Parts → actions: `unlock press` (biometric prompt), `pin type` (`KitNumberPad` digits and backspace),
  `items root press`, `items copyUser copy`, `items copySecret copy`, `items reveal toggle`,
  `items delete press`.
  `meta.confirmParts: ["delete"]`; `meta.partTiers: { unlock: "ok", copySecret: "ok", reveal: "ok" }`.
- States: filled, empty (no saved vault items), loading (decrypting vault), error (wrong PIN or biometric
  authentication failed).
- Real path: vault records encrypted on the device using an OS keystore key unlocked by biometrics or
  `KitNumberPad` PIN (`!needs-ok`); optional cloud sync stays end-to-end encrypted.
- Density: `meta.dense: true`, weight 3; personal password vaults scan up to 24 credential entries.

### `PasswordGen` · planned · input · phone
A random password and diceware passphrase generator with character-class syntax tinting and a live entropy
strength meter. A slider adjusts length (8–64 chars) or word count (3–10 words) alongside uppercase, digit,
symbol, and separator toggles. Copy and Regenerate actions roll fresh CSPRNG secrets offline.
- Pick: generating strong passwords or memorable passphrases with live entropy indicators. Not plain form
  inputs (`Field`) or browsing saved logins (`CredentialVault`).
- Writes: `mode` (`password` default, `passphrase`), `length` int 8–64 (default 16, `password`), `words`
  int 3–10 (default 4, `passphrase`), `uppercase` boolean (default true), `digits` boolean (default true),
  `symbols` boolean (default true), `separator` (`-`, `.`, `_`, `space`) (default `-`), `capitalize`
  boolean (default true, `passphrase`); `style`. Generated output strings and entropy bits are computed by
  the host CSPRNG (`crypto.getRandomValues`), never deterministic model-written passwords.
- Styles: `password` (default, character-set toggles and 8–64 char slider), `passphrase` (word-count
  slider, separator chips, and capitalization toggle).
- Parts → actions: `length set`, `uppercase toggle`, `digits toggle`, `symbols toggle`,
  `separator select`, `capitalize toggle`, `regenerate press`, `copy copy`.
- States: filled, loading, success (copied to clipboard).
- Real path: runs offline on the device using cryptographic randomness and a local word list; copying
  writes to the clipboard (and optional auto-clear timer in host).

### `RecoveryCodes` · planned · content · phone
A register of masked one-time MFA emergency backup codes (`secret`) for an account or vault. Users unlock
reveal mode to inspect codes, tick off spent codes as used, or copy the remaining list. Confirming
Regenerate warns before invalidating older backup codes.
- Pick: storing, tracking used status, and rotating one-time MFA recovery codes. Not plain text memos
  (`Note`) or general login entries (`CredentialVault`).
- Writes: `service` text(32), `account` text(36), `codes` of `id` text(24), `code` secret(24), `used`
  boolean (default false), `usedAt` date optional, 4–12; `revealed` boolean (default false); `style`.
  Code tracks remaining unused count automatically and masks unrevealed codes as `(secret)` in reads.
- Styles: `grid` (default, two-column code grid with used ticks), `list` (single-column rows with used
  dates).
- Parts → actions: `reveal toggle`, `codes used check`, `copyAll copy`, `regenerate press`.
  `meta.confirmParts: ["regenerate"]`; `meta.partTiers: { reveal: "ok", copyAll: "ok" }`.
- States: filled, empty, loading, success (codes copied or regenerated), error (reveal auth failed).
- Real path: one-time backup codes stored encrypted in the local vault; revealing or copying requires
  device unlock confirmation (`!needs-ok`), and actual code rotation happens on the external service.

### `VpnTunnel` · planned · action · service
A VPN protection status panel and exit-server selector showing exposed, connecting, or protected tunnel
states. The main shield screen pairs a connect toggle, virtual IP readout, WireGuard or OpenVPN selector,
kill-switch toggle, and live throughput sparkline. Server mode lets users compare exit countries by latency
and load.
- Pick: connecting or disconnecting an encrypted VPN tunnel, choosing exit servers, and monitoring live
  tunnel traffic. Not measuring ISP bandwidth (`utilities/SpeedGauge`) or controlling home hardware
  (`home/Devices`).
- Writes: `status` (`exposed`, `connecting`, `protected`), `server` text(32), `virtualIp` text(24)
  optional, `protocol` (`wireguard` default, `openvpn`), `killSwitch` boolean (default true), `servers` of
  `id` text(24), `country` text(24), `city` text(24), `latencyMs` int ≥ 0 optional, `loadPct` int 0–100
  optional, 1–8, `trafficSamples` 3–12 numbers optional; `style`. Live virtual IP, latency, and encrypted
  traffic readings come from the tunnel adapter, never invented when `exposed`.
- Styles: `shield` (default, status banner + connect toggle + active server + sparkline), `servers`
  (searchable/scrollable server list with latency and load pills).
- Parts → actions: `connect toggle`, `servers root select`, `protocol select`, `killSwitch toggle`.
- States: filled, loading (negotiating handshake), error (VPN permission denied or tunnel dropped).
- Real path: establishes an encrypted WireGuard or OpenVPN tunnel via an external VPN service and OS VPN
  profile permission.

### `SecurityAudit` · planned · data · phone
A credential hygiene audit computing an overall 0–100 safety score from stored vault and 2FA records.
Category breakdowns count breached, reused, weak, and unprotected accounts above tappable remediation
rows. Opening any issue navigates straight to the affected credential or token setup.
- Pick: auditing password hygiene, breach exposure, and 2FA coverage with remediation shortcuts. Not
  tax-evidence completeness (`paperwork/TaxYear`), device OS compliance (`DeviceTrust`), or OS junk
  cleaners (`Canvas`).
- Writes: `checkedAt` ISO datetime with offset optional, `breachedCount` int ≥ 0, `reusedCount` int ≥ 0,
  `weakCount` int ≥ 0, `no2faCount` int ≥ 0, `issues` of `id` text(24), `title` text(32), `kind`
  (`breached`, `reused`, `weak`, `no_2fa`), `severity` (`high`, `medium`, `low`), `goto` optional, 0–6;
  `style`. Overall hygiene score (`0–100`) and severity counts are computed in code from stored vault and
  token records, never model-invented.
- Styles: `overview` (default, computed score ring + category counts + top remediation rows), `issues`
  (actionable remediation list).
- Parts → actions: `issues root press` (opens affected vault/token screen), `issues dismiss dismiss`,
  `refresh press`.
  `meta.confirmParts: ["dismiss"]`; `meta.partTiers: { refresh: "service" }`.
- States: filled, empty (no issues found — score 100), loading (checking k-anonymity breach index),
  error (breach check service unreachable).
- Real path: weak, reused, and missing-2FA checks evaluate locally against stored vault metadata; live
  breach checks query a k-anonymity breach service (`!needs-service`).

### `DeviceTrust` · planned · data · ok
An enrolled device security posture report checking OS screen lock, hardware biometrics, disk encryption,
OS patches, and MDM compliance. Each check displays pass or fail status with a Fix link to remediate
gaps. An enrollment view exposes organization certificate metadata and a confirmed Unenroll action.
- Pick: checking device security compliance and MDM enrollment state for SSO or vault access. Not
  password hygiene (`SecurityAudit`), smart-home appliances (`home/Devices`), or local phone files
  (`utilities/FileBrowser`).
- Writes: `deviceName` text(32), `osVersion` text(24), `orgName` text(28) optional, `enrolledAt` date
  optional, `checks` of `id` text(24), `label` text(32), `detail` text(48), `passed` boolean, `goto`
  optional, 2–6; `style`. Overall compliant/non-compliant posture is computed by code from `checks`.
- Styles: `posture` (default, compliance summary + OS posture checks + recheck), `enrollment` (adds org
  MDM certificate facts and Unenroll button).
- Parts → actions: `checks root press` (opens OS fix guidance or settings link), `recheck press`,
  `unenroll press`.
  `meta.confirmParts: ["unenroll"]`; `meta.partTiers: { unenroll: "service" }`.
- States: filled, loading (inspecting device posture), success (all checks passed), error (attestation
  failed or device rooted/jailbroken).
- Real path: inspects device lock, encryption, and keystore capabilities via OS security APIs (`ok`), with
  enterprise MDM unenrollment handled by the identity service (`!needs-service`).

## Archetypes (4)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `sec_auth` | Live 2FA codes, push MFA and QR enrollment | `security_codes`, `security_push`, `security_enroll` | `security_codes`: Header, Search, AuthTokens, Button · `security_push`: Header[back], Banner, PushChallenge, Note · `security_enroll`: Header[back], Steps, Camera[scan], Note, Button |
| `sec_vault` | Encrypted vault, password generator and backup codes | `security_items`, `security_gen`, `security_recovery` | `security_items`: Header, Search, Chips, CredentialVault, Button · `security_gen`: Header, PasswordGen, Note, Button · `security_recovery`: Header[back], Banner, RecoveryCodes, Note |
| `sec_vpn` | VPN shield status and exit server selection | `security_status`, `security_servers` | `security_status`: Header, VpnTunnel[shield], KeyValue, Note · `security_servers`: Header[back], Search, Chips, VpnTunnel[servers] |
| `sec_audit` | Vault hygiene audit and device posture check | `security_health`, `security_device` | `security_health`: Header, SecurityAudit, Note, Button · `security_device`: Header[back], DeviceTrust, KeyValue, Note |

The first listed layout is each archetype's `defaultLayout`; every layout id is `security_`-prefixed and
unique across the catalog. Recipes use only core components plus `security` pack components, keep at most
one dense component (`CredentialVault`) per layout, and stay within screen weights 5–7. `security_enroll`
uses core `Camera[scan]` for scanning `otpauth://` QR codes without creating a duplicate camera component.

## Worked example: Keystone

A personal authenticator, credential vault, and VPN app built with `security`. On `sec_auth/security_codes`,
`AuthTokens` counts down 30-second 2FA codes with `KitRadialTrack` rings while `security_push` presents an
incoming `PushChallenge` (`number_match`) for a laptop sign-in and `security_enroll` adds a new account via
core `Camera[scan]`. In `sec_vault/security_items`, unlocking `CredentialVault` via biometrics or
`KitNumberPad` PIN exposes saved logins and passkeys with one breach warning flagged; tapping Fix jumps to
`security_gen` where `PasswordGen` rolls a 20-character CSPRNG password, and `security_recovery` marks
spent MFA backup codes in `RecoveryCodes`. For travel Wi-Fi, `sec_vpn/security_status` connects
`VpnTunnel[shield]`, while `sec_audit/security_health` shows the computed `SecurityAudit` score and
`security_device` checks OS encryption in `DeviceTrust`. Signature: `ring_fill` on an optional core `Ring`
mirroring the security score, or `count_up` on `Stats`; no new signature proposed.

## Tiers

`AuthTokens`, `CredentialVault`, `PasswordGen`, `RecoveryCodes`, and `SecurityAudit` run locally over
device-stored records (`phone`), with camera QR enrollment, biometric/PIN reveal, and secret copying gated
by `!needs-ok` and encrypted token sync or breach lookups marked `!needs-service`. `DeviceTrust` requires
device posture permissions (`ok`, with MDM unenroll at `service`). `PushChallenge` and `VpnTunnel`
require external security/tunnel services (`service`).

## Build notes

- Order: `PasswordGen`, `AuthTokens`, `RecoveryCodes`, `CredentialVault`, `SecurityAudit`, `DeviceTrust`,
  `PushChallenge`, `VpnTunnel`; all remain planned.
- No new Wave 6 kit base is required: `AuthTokens` reuses `KitRadialTrack`, and `CredentialVault`'s
  locked PIN gate reuses `KitNumberPad` alongside `KitCard`, `KitRow`, `KitText`, `KitTrail`, `KitOption`,
  `KitMeter`, `KitSlider`, `KitCheck`, `KitSpark`, `KitRing`, and `KitAction`.
- Strict `writerFormat(registry)` admits only core plus chosen packs; no aliases or off-pack fallbacks.
  Each component ships two examples, choose/write/read probes, kit-only renderers, and a pack
  `example.jsonl` rendered in three presets.
- All TOTP seeds, vault secrets, and recovery codes use core `secret` props and read back strictly as
  `(secret)`; `PasswordGen` values come from host CSPRNG, never hardcoded example strings in runtime state.
- `CredentialVault` carries `meta.dense: true` (weight 3); `AuthTokens` and `SecurityAudit` issues cap
  at six visible rows with shared "and N more" overflow copy.
- Destructive and security-critical actions (`AuthTokens.remove`, `PushChallenge.deny`,
  `CredentialVault.delete`, `RecoveryCodes.regenerate`, `SecurityAudit.dismiss`, `DeviceTrust.unenroll`)
  declare `meta.confirmParts` and route through shared confirmation.

## Open questions

- **New action names?** None. Copying secrets/codes/passwords uses `copy`; QR enrollment uses `scan`;
  revealing, connecting, and toggling charsets use `toggle`; number-match and servers use `select`.
- **Autofill & OS VPN kernel extensions?** Out of scope for declarative showcases; Android Autofill
  Service, iOS Credential Provider, and native WireGuard/NEPacketTunnel drivers belong in host adapters.
- **Enterprise SSO + `comms`?** Pairing `security + comms` covers enterprise workplace apps like Outlook
  and Teams paired with Microsoft Authenticator or Duo Mobile without pack dependencies.
