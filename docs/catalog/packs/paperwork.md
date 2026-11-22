# `paperwork` pack

**Status:** planned · **Wave:** to be decided · **Pick line:** Life admin: documents, renewals, receipts,
forms to sign and deadlines. Not travel documents (`trips`), owned things' warranties (`inventory`), client
agreements (`customers`) or payments to track (`money`).

## Purpose

IDs, insurance, tax evidence, certificates and personal contracts, with action dates and proof files.
The pack is a local filing cabinet, not a bank, travel wallet, warranty book or client-consent workflow.
Its hand-drawn signature pad for personal forms does not promise legally verified e-signing.

## Apps it serves

Household vault, freelancer tax prep, insurance and licence renewals, small-office forms, certificates and IDs.

## What the core already covers

- Scanning a receipt or document now: `Camera` kind `scan`; choosing an existing picture: `Field` kind
  `photo`; viewing scanned pages: `Photo` or `Gallery`. There is no pack scanner.
- A few files to open: `List`; one file's facts: `KeyValue`; a folder's featured document: `Card`.
- Finding and filtering: `Search`, `Chips`; editing names and dates: `Field`; longer notes: `Composer[entry]`.
- A deadline alone: `Timer[until]`; marked due days: `Calendar`; a history of submissions: `Timeline[history]`.
- A form's jobs to tick off: `Checklist`; its stages: `Steps`; actual fields: `Field`, `Choice` and
  `Button`. The proposed `FormChecklist` is dropped: evidence-free tasks do not need a domain component.
- One receipt amount or a host-computed total: `Amount`; several counts: `Stats`; evidence collected
  against a target: `Progress`. There is no separate totals or deadline component.

`Documents` adds private files and expiry rules; `Renewals` separates notice and end dates. `Receipts`
links evidence to allocations; `TaxYear` matches a period's records, not model-written completion.
`Signature` captures a drawn mark, which a typed-name `Field` cannot do.

## Components (7)

### `Documents` · planned · data · phone · body · weight 2

A file register with title, owner, issuer, masked number, attachment and optional expiry. Warnings are
computed; opening a record shows its local file, never an unmasked number in an agent read.

- Pick: private life-admin records with files, identifiers and expiry dates. Not a few ordinary links
  (`List`), documents assessed against trip dates (trips `TravelDocs`), purchase warranties (inventory
  `Warranties`) or rental terms and rent dates (inventory `Lease`).
- Writes: `docs` of `title` text(32), `kind` (`id`, `insurance`, `certificate`, `tax`, `contract`, `form`,
  `other`), `owner` text(24), `issuer` text(24) optional, `number` secret(32) optional, `issued` date
  optional, `expires` date optional, `file` text(120) optional, `tags` text(16) each
  0–3, `goto` optional, `folder` text(24) optional, `pages` int ≥ 1 optional, `share` boolean optional,
  1–6; `style` (`cards`, `folders`) optional. `file` is a private `local:<id>` or synthetic `lib:<id>`.
  Expiry status and time left come from `expires` and the host's clock.
- Styles: density: `comfortable` (default), `compact`; surface: `card` (default), `plain`;
  detail: `full` (default), `brief` (hides `issuer`, `number`, `issued`, `tags`). Omitting `style`
  preserves rows; `cards` uses file-type tiles, not readable photos of IDs. `folders` groups in
  first-appearance order with unfiled records last, without changing item addresses.
- Parts → actions: `root`, `empty`, `error`; docs `root press` (opens `goto` or the local file), docs
  `title`, docs `kind`, docs `owner`, docs `issuer`, docs `number`, docs `issued`, docs `expires`,
  docs `file`, docs `tags`, docs `warning`, docs `folder` (row detail outside folders style), docs
  `pages`, docs `share press` (only with explicit `share: true`, an attachment and an available
  `shareDocument` host command), docs `remove press` (removes the entry, not the source file), docs
  `remove_icon`; `meta.partTiers: { share: "service" }`, `meta.confirmParts: ["remove", "share"]`.
- States: filled, empty, loading, error (file unavailable).
- Real path: records and private attachments kept on the device; original files are opened by a local
  host viewer, with identifiers masked and read as `(secret)`.

### `Renewals` · planned · data · phone

Administrative obligations in action-date order, with owner, due and notice dates, completed tick and local
reminder. A policy can end in February but require a decision in January; the two dates stay distinct.

- Pick: acting on a licence, policy, certificate or personal contract before its deadline. Not just
  seeing when a file expires (`Documents`), recurring payments (money `Bills`), maintenance for a pet,
  plant or car (home `CareSchedule`), or an owned thing's warranty (inventory `Warranties`).
- Writes: `items` of `title` text(32), `for` text(24) optional, `due` date, `noticeBy` date optional
  (no later than `due`), `completedOn` date optional, `goto` optional, 1–6; `style`. Code orders by the
  earlier of `noticeBy` and `due`, derives due-soon and overdue, and derives the tick from `completedOn`.
- Styles: `due` (default), `cards` (both dates named, for obligations with a notice window).
- Parts → actions: items `root press`, items `done check` (sets or clears the local completion date),
  items `remind press` (`meta.partTiers: { remind: "ok" }`, `!needs-ok`), items `remove press`
  (`meta.confirmParts: ["remove"]`; deletes the local tracker entry, never cancels a policy).
- States: filled, empty, loading, success (all current obligations completed).
- Real path: deadlines entered from the actual document and completion dates stored on the device;
  scheduling local notifications needs permission, and completing a renewal happens outside the tracker.

### `Receipts` · planned · data · phone

Purchase evidence with payee, date, amount, category, private scan and reviewed tick. An allocation
percentage records the person's assigned share; code computes its amount without calling it a deduction.

- Pick: retaining and reviewing receipts for life admin or tax evidence. Not proof tied to an owned
  thing's warranty (inventory `Warranties`), bank movements without evidence (money `Transactions`),
  an order placed through a shop (commerce `OrderSummary`) or a client bill (customers `Invoice`).
- Writes: `items` of `payee` text(32), `date`, `amount` number ≥ 0, `category` text(16) optional,
  `file` (private attachment reference text(120)) optional, `allocation` percent 0–100 optional, `reviewed` boolean,
  `tags` text(16) each 0–3, `goto` optional, 1–6; `style`. Allocated amounts are computed only when
  `allocation` is supplied; totals come from stored records, never a second Writer value or currency.
- Styles: `rows` (default), `cards` (a neutral attachment tile plus the same evidence fields).
- Parts → actions: items `root press`, items `reviewed check`, items `remove press`
  (`meta.confirmParts: ["remove"]`; removes the evidence record, not its original file).
- States: filled, empty, loading, error (attachment unavailable).
- Real path: receipts entered or photographed with core `Camera`, checked by the person and stored
  locally; amounts use the brief's currency through `moneyLine`, not a bank or tax service.

### `Signature` · planned · input · phone · body · weight 3

One personal form's drawing pad, labelled with document and signer, with clear and save controls. Saving
binds the person's drawn mark to that version as a dated local copy, without claiming identity assurance.

- Pick: drawing a signature on a personal administrative form. Not typed-name acceptance of a client's
  waiver (customers `Agreement`), a tick box (`Field[toggle]`) or merely viewing a document (`Documents`).
- Writes: `title` text(32), `document` text(120), `signer` text(28), `hint` text(60) optional,
  `style`, `datedStamp` boolean optional. `document` is a private `local:<id>` or synthetic `lib:<id>`.
  Only `datedStamp: true` asks the host to stamp the signing date on the copy itself. The mark, document
  version, timestamp and saved state are host-owned, not Writer props. Showcase marks must be visibly
  synthetic fixtures, never copied real signatures.
- Styles: `pad` (default; draw a full signature), `initials` (draw initials in the same private pad);
  density: `comfortable` (default), `compact`; surface: `card` (default), `plain`; detail: `full`
  (default), `brief` (hides `hint`).
- Parts → actions: `root`, `title`, `signer`, `hint`, `document press` (local preview),
  `document_label`, `document_icon`, `review check` (confirms the opened version was reviewed),
  `review_label`, `pad set` (device-created local mark reference text(120); human strokes produce it),
  `pad_frame`, `clear press`, `clear_label`, `save press`, `save_label`, `success`, `error`, `sub`,
  `date_stamp` (when requested, before saving); `meta.confirmParts: ["clear"]`.
  Save requires a mark for the reviewed document version and current signing options. The host must
  acknowledge `initials` and `datedStamp: true` in the matching signature record; omit those fields for
  the legacy pad. Only a saved host record for the current version confirms a stamped copy.
- States: empty (no mark), filled (draft mark), loading, success (copy saved), error (file or save failed).
- Real path: a new kit drawing base captures a person's touch or stylus input, and the host saves a local
  signed copy without overwriting the original; identity verification and remote signing are not included.

### `TaxYear` · planned · data · phone · body · weight 3

One filing period's evidence categories, with required and matched counts, missing files and receipt and
allocation totals. Up to eight categories open their evidence; a task tick cannot substitute for a file.

- Pick: completeness of tax evidence for a specified period, computed from linked records. Not a
  general task list (`Checklist`), money in and out (money `Transactions`), a client's invoice (customers
  `Invoice`) or a back-office table of arbitrary records (data `Table`).
- Writes: `label` text(24), `from` date, `to` date, `due` date optional, `requirements` of
  `label` text(32), `source` (`documents`, `receipts`), `tag` text(16), `needed` int 1–12, `goto` optional,
  1–8. `from` must be on or before `to`. Matches need a usable attachment and this period's link and tag; receipts also need
  `reviewed: true` and dates within the inclusive period. Code computes counts, totals and warnings,
  not tax owed; unreviewed or file-less records stay outstanding.
- Styles: density: `comfortable` (default), `compact` (summary rows with the same evidence links);
  surface: `card` (default), `plain`; detail: `full` (default), `brief` (hides `due`, `receipt_total`,
  `allocation_total`).
- Parts → actions: `root`, `label`, `from`, `to`, `due`, `receipt_total`, `allocation_total`, `empty`,
  `success`; requirements `root press` (opens the matching evidence or collection screen when `goto`
  is present), requirements `label`, requirements `meta`, requirements `matched`, requirements
  `needed`, requirements `missing`.
- States: filled, empty (no linked evidence), loading, success (every requirement met, not a filed return).
- Real path: the device matches explicitly linked `Documents` and `Receipts` records against requirements
  entered by the person or their accountant; official tax rules, filing and tax advice remain outside.
- Density: `meta.dense: true`, weight 3; 1–8 categories with row meta text(36), never embedded receipt rows.

### `ScanBatch` · planned · input · ok
A multi-page capture staging tray displaying ordered scanned page thumbnails, total page count, per-page reorder, retake, and remove actions, an Add page button opening the camera scanner, and a Save PDF action. Removing a page confirms first, while code maintains sequential 1-based page numbers across reorders and additions.
- Pick: staging, reordering, and assembling multiple scanned pages into one local document. Not capturing a single image (`Camera[scan]`), viewing read-only photos (`Gallery`), or browsing saved files (`Documents`).
- Writes: `title` text(32) optional, `pages` of `file` (private attachment reference text(120)), `label` text(16) optional, 0–24; `captureGoto` optional, `style`. Page count and sequential numbering are computed by code.
- Styles: `tray` (default, ordered page thumbnail grid with add and save controls), `review` (large preview of the active page above the thumbnail strip).
- Parts → actions: `add scan` (captures another page or opens `captureGoto`), pages `root move` (reorders page to target slot), pages `retake scan`, pages `remove press`, `save press`. `meta.confirmParts: ["remove"]`.
- States: empty (no pages scanned yet), filled, loading (assembling PDF), success (PDF saved), error (camera denied or save failed).
- Real path: device camera permission (`ok`) captures local scanned pages through host scanner adapters and combines them into one local PDF file without cloud uploads.
- Density: `meta.dense: true`, weight 3; multi-page capture batches stage up to 24 ordered pages.

### `FormFiller` · planned · input · phone
A field-by-field local PDF or administrative form completion panel displaying named inputs, validation hints, a completion meter, a link to preview the underlying document, and a Save copy button. Saving exports a filled local copy without mutating the original blank template or sending it to an outside service.
- Pick: filling named fields tied to a personal administrative PDF or form document. Not standalone generic inputs (`Field`), capturing a drawn signature mark (`Signature`), or signing client waivers (customers `Agreement`).
- Writes: `title` text(32), `document` (private attachment reference text(120)), `fields` of `label` text(28), `kind` (`text`, `date`, `number`, `check`), `value` text(80) optional (or boolean for `check`), `required` boolean (default false), 1–16; `style`. Completed count and completion percentage are computed by code from the fields.
- Styles: `form` (default, completion meter, preview link, and all named fields), `compact` (required fields only).
- Parts → actions: `preview press` (opens local document preview), fields `field type` (for text, date, or number fields), fields `check check` (for `check` fields), `save press`, `clear press`. `meta.confirmParts: ["clear"]`.
- States: filled, empty (no template fields loaded), loading, success (filled local copy saved), error (missing required field or save failed).
- Real path: form definitions and entered values stored locally on the device; the host viewer previews the document and writes a filled copy locally without coordinate-space ink editing.
- Density: `meta.dense: true`, weight 3; administrative forms hold up to sixteen named fields bound to one document.

## Archetypes (4)

| Archetype  | Job                                  | Layouts                                      | Recipe                                                                                                                                                                |
| ---------- | ------------------------------------ | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vault`    | Keep and open life-admin files       | `vault_all`, `vault_record`, `vault_capture` | `vault_all`: Header, Search, Chips, Documents, Button · `vault_record`: Header[back], KeyValue, Documents, Note · `vault_capture`: Header, Camera[scan], Note, Button |
| `due_soon` | Act before paperwork deadlines       | `paperwork_due`, `paperwork_renewal`         | `paperwork_due`: Header, Calendar[week], Renewals, Button · `paperwork_renewal`: Header[back], Renewals[cards], Field[date], Note, Button                             |
| `sign`     | Review and sign one personal form    | `paperwork_sign`, `paperwork_signed`         | `paperwork_sign`: Header[back], Steps, Note, Signature · `paperwork_signed`: Header[back], Success, Documents, Button                                                 |
| `tax_prep` | Collect evidence for a filing period | `tax_evidence`, `tax_receipts`, `tax_tasks`  | `tax_evidence`: Header, TaxYear, Note, Button · `tax_receipts`: Header, Search, Receipts, Button · `tax_tasks`: Header, Steps, Checklist, Button                      |

The first layout in each row is its `defaultLayout`. Layout ids are unique across the catalog, not bare
`list`, `form` or `summary`. Recipes use only core and this pack, stay within weight 12 and two weight-3
components, and separate repeated types. `Signature` owns save on `paperwork_sign`; no second primary
action competes with it. `paperwork_signed` opens only after a successful local save.

## Worked example: Trot (paperwork side)

Alex, Trot's sole-trader dog walker, keeps insurance, an ID and certificates in `vault/vault_all`.
`due_soon/paperwork_due` separates notice and end dates, recording completion after actual renewal.
`tax_prep/tax_receipts` holds six synthetic supplies and fees receipts with scans and reviewed allocations.

`tax_prep/tax_evidence` matches the accountant's required statements and expense evidence for the chosen
period, computes what is missing and opens each category. `tax_prep/tax_tasks` uses core `Checklist` for
checking the folder and handing it to the accountant. Alex reviews a personal office administration form
and draws a synthetic mark on `sign/paperwork_sign`; its copy enters the vault. Client waivers stay in
`customers`. Signature moment: exactly one `check_burst` on the preparation checklist, not a drawn signature.

## Tiers

All components work locally. `Renewals.remind` and core `Camera` need `ok`; core photo picking's tier is
pending. No files upload silently. Shared office access needs `people`; remote signing, cloud storage,
OCR and filing need `service` and are outside the default plan.

## Build notes

- Order: `Documents`, `Renewals`, `Receipts`, `TaxYear`, then `Signature` after its drawing-base prototype; Wave 6 additions follow in order: `ScanBatch`, `FormFiller`.
  All are planned; no component enters live prompts before the complete pack passes the pack gates.
- Wave 6 option upgrades on existing components: `Documents` adds `folder` text(24) + `style: "folders"`, `pages` int, and `share press` (`meta.partTiers: { share: "service" }`); `Signature` adds `style: "initials"` and `datedStamp` boolean; `Renewals` adds `autoRenews` boolean warning flag before `noticeBy`; `Receipts` adds optional `taxAmount` and `status` (`pending`, `reviewed`, `flagged`).
- Wave 6 boundaries: collaborative cloud folders and ACLs belong in `workspace`, coordinate-space PDF ink markup stays in `Canvas`, business P&L/VAT stays in `books`, and travel IDs stay in `trips`. Also pair `Documents` / `Receipts` attachments with proposed Core `FileList`.
- Use strict `writerFormat(registry)` for core plus selected packs only; no aliases or off-pack fallbacks.
  Each component needs two domain examples, probes and a renderer composed only from kit bases; the pack
  needs `example.jsonl` rendered in three presets. Fallbacks use cast records or shared neutral placeholders.
- All components live in the body. Weight is 2 except `TaxYear` (dense, weight 3) and `Signature` (drawing
  interaction, weight 3). Other lists have 1–6 Writer seed rows; the host pages larger collections and
  supplies a quiet “and N more” count, not a model-invented total.
- Private attachment references are local opaque ids or bundled synthetic fixtures, never remote URLs,
  file contents or secrets in prompts. Readers print `(private file)` and `(private mark)`; identifiers
  use core `secret`. The host viewer handles document pages, not Writer-authored legal text or HTML.
- `Signature` needs a proposed `KitSignaturePad` and a host adapter for private file viewing and saving.
  Touch points stay inside that base; the shared dispatcher receives the same `pad set` reference that
  agent actions validate. Only references to person-created marks for the reviewed document are accepted;
  agents cannot draw, create consent or silently reuse a mark on another version.
- Dates are `YYYY-MM-DD` in the host's local calendar. Default due-soon window: 30 days, host-configured,
  not a Writer status. Do not guess statutory filing dates or a renewed policy's new expiry: the person
  enters them from the source. Completion stores an event; undoing a tick never cancels a real renewal.
- `TaxYear` queries the host's record store, not just the six visible rows or other components on its
  screen. Period links and tag matches are validated; each record counts once per requirement and once
  in monetary totals. Allocations are arithmetic on supplied percentages, never eligibility judgments.
- Removals and draft clear use `meta.confirmParts` and standard confirmation; its pending shared dispatch
  is an implementation gate, not assumed built.

## Open questions

- **New action names?** None. Opening, saving, removing and reminding use `press`; completion and review
  use `check`; drawing commits a private mark reference through existing string-valued `set`.
- **Legally binding or remote e-signatures?** Default: no legal-validity or identity claims. Verified
  signing needs its own tier and consent design; client acceptance remains customers `Agreement`.
  Prototype `KitSignaturePad` before implementation; no new signature moment.
- **OCR, PDF export and automatic tax rules?** Default: manual entry checked against local originals.
  Local signed-copy saving needs the host adapter; general exports and external extraction or filing
  services are future host features, not implied by `Receipts` or `TaxYear`.
- **Retention, backup and jurisdiction?** Default: originals untouched; no automatic deletion or backup.
  The person chooses the tax period, evidence requirements and dates. Host backup needs explicit consent.
