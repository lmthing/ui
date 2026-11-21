# `community` pack

**Status:** planned · **Wave:** to be decided · **Pick line:** A club, association or neighbourhood group
run by its members: dues, notices, votes, sign-ups, minutes. Not sharing posts (`social`), not organising
one gathering (`events`), not staff shifts (`team`).

## Purpose

The continuing work of a member-run group: who belongs and can vote, subscriptions collected by the
treasurer, motions decided under the group's rules, contributions people claim, and the agreed record of
decisions and actions. Notices use the core; this pack adds governance, not another social feed.

## Apps it serves

Residents' association, school parents' group, allotment club, choir, neighbourhood association,
community garden committee, amateur society.

## What the core already covers

- A noticeboard: a pinned `Card` above a `SectionTitle` and `List`; `List[expand]` opens longer notices.
  An urgent notice is a `Banner`. Drop `Notices`: pinning is host ordering, not a new component.
- A fundraising goal: `Ring` with `Amount`, or `Progress` for several funds. Drop `Campaign`: the host
  sums contributions, and a core `Button` opens the contribution form or payment service.
- A small directory: `People[rows]`; officers: `People[stack]`; one member: `Profile` and `KeyValue`.
- Meeting dates and the agenda: `Calendar`, `Timeline[day]`, `List`; drafting notes: `Composer[entry]`.
- Ordinary jobs: `Checklist`; attendance: `People`; preferences: `Choice`; short rules: `List[expand]`.

`Members` stays for membership dates, voting rights and dues reconciliation, not names and roles alone.
`Dues` relates assessments to receipts, unlike an `Amount` or badge. `Vote` binds a motion to eligibility,
quorum and a decision rule. `SignUpSheet` reserves counted contributions atomically, not just a choice.
`Minutes` links agreed decisions to owned actions and approval, not just a note beside a checklist.
Posts and comments belong to `social`; one gathering's invitations and guests to `events`; scheduled
staff or volunteer cover to `team`; arbitrary back-office tables and reports to `data`.

## Components (6)

### `Members` · planned · data · phone
The membership register: names and roles, joining and leaving dates, voting rights, and a dues badge from
the ledger. Opening a member shows their record; ending membership keeps their history.
- Pick: a group's membership and eligibility register. Not a small directory (`People`), a person's
  identity (`Profile`), business clients (customers `ClientCard`), or event guests (events `GuestList`).
- Writes: `members` of `id` text(24), `name` text(24), `roles` text(24) each 0–3, `joined` date,
  `ended` date optional, `votingRights` boolean, `photo` optional, `goto` optional, 1–30; `style`.
  Active membership follows from dates; dues badges and counts come from the host's ledger, never props.
- Styles: `register` (default), `compact` (name, primary role and computed badges).
- Parts → actions: members `root press` (linked only), members `end press` (secretary only).
  `meta.confirmParts: ["end"]`. Ending sets `ended` to today; past vote snapshots stay unchanged.
- States: filled, empty, loading, success (membership ended), error (save failed).
- Real path: records on the secretary's device; members viewing their own records need a shared app.
- Density: `meta.dense: true`, weight 3; a membership register needs more than six records.
- Wave 6 options: add optional `badge` text(16) (such as `"Verified Neighbor"` or `"Keyholder"`) and `committee` tag.

### `Dues` · planned · data · phone
One subscription period: each member's assessment, receipts and amount still owed, with collected and
outstanding totals. The treasurer records payments; a member can pay only through an attached service.
- Pick: collecting and reconciling membership dues. Not a person's bills (money `Bills`), a client invoice
  (customers `Invoice`), or one client's payment (customers `PaymentStatus`).
- Writes: `period` text(20), `assessments` of `id` text(24), `memberId` text(24), `amount` number ≥ 0,
  `due` date, 1–30; `receipts` of `id` text(24), `assessmentId` text(24), `amount` number > 0, `date`,
  `method` (`cash`, `transfer`, `card`), `voided` boolean (default false), 0–60; `style`.
  Amount paid, outstanding, credit, totals, partial-payment and overdue statuses are computed.
- Styles: `ledger` (default, treasurer), `member` (the signed-in member's assessments and receipts only).
- Parts → actions: assessments `record press` (ledger; opens a core receipt form), assessments
  `remind press` (ledger), assessments `pay press` (member; service attached only), receipts `void press`
  (ledger; reverses the receipt without deletion). `meta.confirmParts: ["void"]`;
  `meta.partTiers: { remind: "service", pay: "service" }`.
- States: filled, empty, loading, success (receipt recorded), error (recording or payment failed).
- Real path: a local ledger with numeric receipt amounts; reminders use messaging, payments a payment
  service. Only its confirmed receipt changes the ledger; pressing pay never marks an assessment paid.
- Density: `meta.dense: true`, weight 3; assessments and receipt lines form one reconciled document.
- Wave 6 options: add `cadence` (`annual`, `monthly`, `one_off`), `waived` boolean, and optional `householdId` grouping.

### `Vote` · planned · input · people
One formal motion with for, against and abstain, the person's ballot, participation against quorum, and
the decision after closing. Before closing it shows participation, not a winning outcome.
- Pick: members deciding a motion under quorum and a passing rule. Not an opinion question (social
  `Poll`), a personal choice (`Choice`), a date search (events `FindDate`), or a manager's approval (team `Approval`).
- Writes: `id` text(24), `motion` text(120), `detail` text(240) optional, `opens` and `closes` ISO
  datetimes with offsets (`opens` before `closes`), `quorum` int 1–30, `rule` (`majority`, `two_thirds`,
  `unanimous`), `ballots` of `memberId` text(24), `choice` (`for`, `against`, `abstain`), 0–30;
  `cancelled` boolean (default false); `style`. No model-written counts, percentages or outcome.
- Styles: `ballot` (default), `result` (read-only counts and decision after closing).
- Parts → actions: `for select`, `against select`, `abstain select` (eligible member, while open,
  replacing their previous ballot), `cancel press` (chair only). `meta.confirmParts: ["cancel"]`.
- States: filled (scheduled, open or closed), loading, success (ballot saved), error (ineligible,
  closed or save failed); cancellation is a retained, read-only state, not a failed motion.
- Real path: one ballot per eligible member in a shared app; the host freezes eligibility at opening,
  rejects duplicate or ineligible seed ballots, and freezes the decision at closing.
- Rules: quorum counts all ballots, including abstentions; passing excludes abstentions. `majority`
  needs more for than against; `two_thirds` needs at least two thirds for; `unanimous` needs no against.
  Every pass needs quorum and at least one non-abstaining ballot; a tie fails. Counts are code-owned.
- Weight: 2; ballots are seed records, not a rendered member list; aggregate results and own choice only.
- Wave 6 options: add `style: "motion" | "election"` (plus optional `candidates` and `seats` `1–5`) for multi-candidate board or officer elections under quorum rules.

### `SignUpSheet` · planned · input · people
A group's contribution slots: what is needed, places remaining, who has claimed each, and claim or
release. Full slots cannot be claimed; releasing a place makes it available to someone else.
- Pick: members claiming limited contributions or places on an ongoing group's sheet. Not jobs to tick
  (`Checklist`), bookable start times (booking `Slots`), gifts (events `Registry`), or staff cover (team `OpenShift`).
- Writes: `title` text(40), `slots` of `id` text(24), `title` text(32), `meta` text(36) optional,
  `capacity` int 1–12, 1–12; `claims` of `slotId` text(24), `memberId` text(24), 0–48; `style`.
  Claimed counts, remaining capacity, full status and the person's claims are computed.
- Styles: `slots` (default), `compact` (one row per slot, expanding to show claimants).
- Parts → actions: slots `claim press` (active member, free place only), slots `release press` (own
  claim only), slots `root toggle` (compact). `meta.confirmParts: ["release"]`.
- States: filled, empty, loading, success (claim saved), error (place just taken or save failed).
- Real path: atomic claims in a shared app; one claim per member per slot, multiple different slots
  allowed. The host rejects duplicates and over-capacity seeds; a losing concurrent claim shows error.
- Density: `meta.dense: true`, weight 3; a contribution sheet can have more than six slots.

### `Minutes` · planned · content · people
The meeting's official record: decisions, linked motions and follow-up actions with owners, due dates and
done marks. Members approve the record; approved decision text stays fixed while actions can progress.
- Pick: agreed decisions linked to accountable follow-up in a member-run group. Not free-form notes
  (`Composer`), ordinary jobs (`Checklist`), long prose (media `Article`), or a change audit (data `ActivityLog`).
- Writes: `title` text(40), `date`, `chairId` text(24), `decisions` of `id` text(24), `title` text(32),
  `text` text(200), `voteId` text(24) optional, 1–8; `actions` of `id` text(24), `decisionId` text(24),
  `text` text(36), `ownerId` text(24), `due` date optional, `done` boolean, 0–12; `approvedAt` ISO
  datetime with offset optional, `approvedBy` text(24) optional (both approval props together); `style`.
  Linked vote outcomes, overdue actions and completion counts are computed, never written twice.
- Styles: `record` (default, decisions and actions together), `actions` (owned follow-up with decision links).
- Parts → actions: decisions `root press` (linked motion only), actions `done check` (owner or secretary),
  `approve press` (chair; draft record only). Approval is a stored sign-off, not another group vote.
- States: filled (draft or approved from `approvedAt`), empty, loading, success (approved or action saved),
  error (save failed). Approval locks decisions, not the actions' completion marks.
- Real path: a shared meeting record linked to stored motions and members; a referenced motion must be
  closed and not cancelled, and later edits never rewrite its frozen result.
- Density: `meta.dense: true`, weight 3; a structured document of decisions and linked action lines.
- Signature: `check_burst` on action completion, reusing the core moment; no new signature.
- Wave 6 options: add `attendance` (`presentIds`, `apologiesIds`) computed against `Members`.

### `ModQueue` · planned · action · people
A volunteer moderation queue showing pending member join applications with screening answers and eligibility status alongside flagged posts or comments. Moderators can approve, decline or remove items and record a community rule reason.
- Pick: reviewing incoming join applications or flagged posts and comments under community rules. Not the member register (`Members`), repair tickets (requests `RequestTriage`), or job candidates (hiring `ApplicantPipeline`).
- Writes: `items` of `id` text(24), `kind` (`join`, `flagged_post`, `flagged_comment`), `author` text(24), `photo` optional, `summary` text(120), `detail` text(200) optional, `reason` text(32) optional, `submittedAt` ISO datetime with offset, `status` (`pending`, `approved`, `declined`, `removed`), `goto` optional, 0–12; `rules` text(32) each 1–6; `style`. Pending count is computed by code.
- Styles: `all` (default, join applications and flagged content together with rule pickers and decision buttons), `joins` (pending membership applications with screening answers only).
- Parts → actions: items `root press` (linked), items `approve press`, items `decline press`, items `remove press`, items `reason select`. `meta.confirmParts: ["decline", "remove"]`.
- States: filled, empty, loading, success (moderation decision saved), error (item already resolved or save failed).
- Real path: pending applications, flagged content and moderator decisions synced in a shared community app (`people`).
- Density: `meta.dense: true`, weight 3; active moderation queues may hold up to 12 pending items.

## Archetypes (3)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `noticeboard` | Group news and contributions | `community_board`, `community_contributions` | `community_board`: Header, Card (pinned notice), SectionTitle, List[expand], Button · `community_contributions`: Header, SignUpSheet, Note |
| `meeting` | Decide and record | `community_motion`, `community_record` | `community_motion`: Header[back], Vote, Note · `community_record`: Header[back], Minutes |
| `membership` | Register and subscriptions | `community_register`, `community_dues`, `community_mod` | `community_register`: Header, Search, Chips, Members · `community_dues`: Header, Dues, Note · `community_mod`: Header, ModQueue, Note |

The first listed layout is each archetype's `defaultLayout`; layout ids carry the pack prefix to avoid
the repeated `list`, `record` and `overview` names elsewhere. Recipes use only core and this pack.

## Worked example: Patch

An allotment association, not Ledge's personal plant care or Trot's business bookings. Twelve members pay
25 each for the year: `membership/community_dues` computes 300 assessed, 200 collected from eight receipts,
and 100 outstanding. The register shows roles, voting rights and matching dues badges.
The `noticeboard` pins a water-supply notice; its contribution sheet asks members to bring tables and
refreshments for a seed swap, not to claim staff shifts. A shed-purchase motion has quorum 8, majority
rule and 11 ballots: 7 for, 3 against, 1 abstain. After closing, code reports passed; `Minutes` links that
decision to Ana obtaining quotes and Lee arranging delivery. Signature: `check_burst` on completing an action.

## Tiers

`Members` and treasurer `Dues[ledger]` work on one phone. Member self-service, ballots, claims and agreed
minutes need a shared app (`people`); a host serving the register or dues to members marks that screen
accordingly. Dues reminders and payment are `service` parts, with their own `!needs-service` marks.
The showcase uses sample records and explains these limits; it does not claim to send or take money.

## Build notes

- Order: `Members`, `Dues`, `Vote`, `SignUpSheet`, `Minutes`, then Wave 6 addition `ModQueue`; all remain planned, no runtime files yet.
- Writers use strict `writerFormat(registry)` for core plus chosen packs; no aliases or off-pack ids.
  Id references are unique snake_case values; member, assessment, slot, decision and vote references
  must resolve. The host keeps one group store; it works even when a sibling component is not on screen.
- Snapshot eligible active members with voting rights at motion opening. Dues never silently remove
  voting rights; the group's stored policy decides them. Today's membership excludes `ended <= today`.
- Sum non-voided receipts per assessment; outstanding is `max(0, assessed - paid)` and credit is
  `max(0, paid - assessed)`. Do not offset one member's credit against another member's debt.
- Dense limits bound complete showcase seeds, not group size. Real totals use full records before
  display slicing; extra rows get shared "and N more" copy. Reads stay one line per member, slot or decision.
- Render from existing kit bases and shared copy, `moneyLine` and date helpers only. Currency comes
  from the brief; no currency props, raw colours, bespoke animation or new kit base is proposed.
- Build acceptance: two domain examples and probes per component, pack positives and near misses,
  and `example.jsonl` validating and rendering in three presets; test tied/all-abstain votes, exact
  quorum, concurrent claims, partial/voided receipts and approved minutes with partly completed actions.
- **Wave 6 additions & options:**
  - Added `ModQueue` (`action`, `people`) for reviewing join applications and flagged posts/comments with rule-reason selection and confirmed decline/remove actions.
  - Option/style upgrades: `Vote` gains `style: "motion" | "election"` (optional `candidates` and `seats` `1–5`) for board/officer elections; `Dues` gains `cadence` (`annual`, `monthly`, `one_off`), `waived` boolean and optional `householdId`; `Members` gains optional `badge` and `committee` tag; `Minutes` gains `attendance` (`presentIds`, `apologiesIds`) computed against `Members`.

## Open questions

- **New actions?** None. Claim, release, record, void, remind, pay, end, cancel and approve are part
  names accepting existing `press`; ballots use `select`, completion `check`, expansion `toggle`.
- **Secret ballots or legal elections?** Default: a small-group recorded ballot, not a certified election.
  Results expose aggregates and own choice; other members' ballots never appear in model reads.
- **Household memberships and proxies?** Default: one membership and one ballot per eligible person;
  group subscriptions, delegation and proxy voting wait for misses.
- **Notice authoring and minutes corrections?** Default: core forms edit notices; approved decision
  corrections are a new meeting record referencing the original, never silent rewriting.
- **Wave and combinations?** Wave to be decided. Optional combinations are index proposals only;
  `social` posts, `events` guests and `team` shifts are not dependencies of this pack.
