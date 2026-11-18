# `hiring` pack

**Status:** planned · **Wave:** to be decided · **Pick line:** Finding people or work: job posts,
applicants, interviews, offers and your own applications. Not staff already hired (`team`), not clients
(`customers`), not a generic kanban (`data`).

## Purpose

Before someone joins a team, a small employer tracks openings and applicants, reviews evidence, arranges
interviews and records offers. A job seeker tracks the same process from the other side. Both can keep
records on one phone; this pack does not promise a job board, shared recruiting system or automatic hiring.

## Apps it serves

A café hiring for summer, Trot recruiting another dog walker, a small studio's recruiting, a charity
recruiting volunteers, a graduate's job hunt, a freelancer tracking applications for employed work.

## What the core already covers

- A short list of openings or applicants: `List` with a status `badge`; finding one: `Search`, `Chips`.
- Identity alone: `Profile`; contact details and simple job facts: `KeyValue`; one featured role: `Card`.
- An application form: `Field`s, `Composer[entry]`, `Button`; interview questions to prepare: `Checklist`.
- Interviews in a day: `Calendar`, `Timeline[hours]`; past contact: `Timeline[history]`.
- One pay figure: `Amount`; stage counts: `Stats`, `Bars`; a deadline: `Timer[until]`.
- Notes: `Composer[entry]`; short requirements or FAQs: `List[expand]`; reminders: `LockScreen` (`ok`).

Separate `JobList`, `ApplicantList`, `ApplicationForm`, `InterviewAgenda` and `HiringStats` are dropped:
each is core plus an option. `JobPost` earns its place with numeric pay terms and application deadlines;
`Candidate` with an application-specific evidence review; `Interview` with a linked meeting's lifecycle;
`Offer` with proposed employment terms and responses; `Applications` with dated follow-ups per application.
`ApplicantPipeline` holds hiring stages and terminal outcomes, not generic cards or sales leads.

## Components (6)

### `JobPost` · planned · content · phone
One opening in full: role, employer, work arrangement, pay range, requirements and how to apply, with a
closing-date notice. Saving it is local; applying opens a form, not a submission to an employer.
- Pick: the terms and application window of one opening. Not several openings (`List`), one featured
  thing (`Card`), staff shifts (team `OpenShift`), or goods for sale (commerce `Product`).
- Writes: `jobId` text(32), `title` text(32), `employer` text(32), `place` text(36) optional,
  `workplace` (`onsite`, `hybrid`, `remote`), `contract` (`permanent`, `fixed_term`, `casual`, `volunteer`),
  `pay` of `min` and `max` numbers ≥ 0 and `per` (`hour`, `month`, `year`) optional, `about` text(400),
  `requirements` text(80) each 1–6, `closes` date optional, `saved` boolean, `goto` (application form), `style`.
- Styles: `full` (default), `compact` (shorter drawing of the same opening).
- Parts → actions: `save toggle`, `apply press` (goes to `goto`), `publish press`.
- States: filled, loading, success (saved or published), error (publication failed).
- Real path: an opening stored on the phone; publishing needs a job-board or website service.
- Metadata: `meta.partTiers: { publish: "service" }`. Code checks `min ≤ max`, formats pay with
  `moneyLine` and the brief's currency, computes closed from `closes`, and disables apply when closed.

### `ApplicantPipeline` · planned · data · phone
Applicants for one opening in four stage columns, each with a count: applied, screening, interview,
offer. Moving an applicant changes their active stage; hired, rejected and withdrawn records leave it.
- Pick: applicants moving toward an employment decision for one job. Not generic work or sales leads
  (data `Board`), a plain applicant list (`List`), or a job seeker's own tracker (`Applications`).
- Writes: `jobId` text(32), `title` text(32), `applicants` of `applicationId` text(32), `name` text(24),
  `stage` (`applied`, `screening`, `interview`, `offer`), `outcome` (`active`, `hired`, `rejected`, `withdrawn`),
  `applied` date, `next` text(36) optional, `nextAt` date optional, `goto`, 1–20; `style`.
- Styles: `columns` (default), `stack` (the same stages vertically).
- Parts → actions: active applicants `root press`, active applicants `root move` (to a stage label).
- States: filled, empty, loading, error (a change could not be saved).
- Real path: application records on the phone; the host moves only active records between active stages.
- Metadata: `meta.dense: true`, weight 3. Reuse `KitColumns`, a shared kit base, not data `Board`.
  Code derives column counts and terminal-outcome counts from records; stage labels come from shared copy.

### `Candidate` · planned · content · phone
One person's application for one opening: submitted date, stage, outcome and an evidence review.
Each criterion shows a reviewer's finding and supporting evidence, never an automatic suitability score.
- Pick: reviewing an applicant against a job's criteria. Not identity alone (`Profile`), generic facts
  (`KeyValue`), a client's summary (customers `ClientCard`), or a general rating (`Scale`).
- Writes: `applicationId` and `jobId` text(32), `name` text(24), `photo` optional, `role` text(32),
  `applied` date, `stage` and `outcome` (the `ApplicantPipeline` enums), `criteria` of `label` text(32),
  `finding` (`unreviewed`, `needs_evidence`, `meets`, `gap`), `evidence` text(80) optional, 1–6;
  `interviewGoto`, `offerGoto` (screen ids), `style`.
- Styles: `review` (default), `summary` (condensed findings).
- Parts → actions: criteria `finding select`, criteria `evidence type`, `interview press`, `offer press`
  (go to their targets), `hire press`, `reject press`, `withdraw press`.
- States: filled, loading, success (decision recorded), error (save failed).
- Real path: a human's review and decisions stored with an application on the phone; these actions record
  decisions, not messages. Hire sets the outcome, without creating a team record.
- Metadata: `meta.confirmParts: ["reject", "withdraw"]`. Terminal outcomes disable further stage moves;
  no ranking, inferred qualifications or findings derived from protected characteristics.

### `Interview` · planned · content · phone
One arranged interview: the application, date, time, duration, format, interviewers, place or call link,
and confirmation status, with edit and cancel. It records an agreed time, not available slots.
- Pick: a hiring interview's details and confirmation. Not choosing bookable time (booking `Slots`),
  a service appointment (booking `Appointment`), or the day's interviews (`Timeline[hours]`).
- Writes: `interviewId` and `applicationId` text(32), `candidate` text(24), `role` text(32), `date`,
  `time` HH:MM, `minutes` 5–240, `format` (`in_person`, `phone`, `video`), `place` text(36) optional,
  `link` (validated HTTPS URL, text(200)) optional, `interviewers` text(24) each 1–6,
  `status` (`proposed`, `confirmed`, `completed`, `cancelled`), `goto` (edit form), `style`.
- Styles: `card` (default), `summary` (all details with an edit link).
- Parts → actions: `edit press`, `cancel press`, `complete press`, `invite send`, `join press`.
- States: filled, loading, success (updated or invitation sent), error (send or save failed).
- Real path: a meeting record entered on the phone after agreeing a time; invitations and opening the
  call link need outside services. No availability lookup, calendar sync or dependency on `booking`.
- Metadata: `meta.partTiers: { invite: "service", join: "service" }`,
  `meta.confirmParts: ["cancel"]`. Code computes end time and past-date notices, not confirmation.

### `Offer` · planned · content · phone
Proposed employment terms: recipient and role, pay, hours, start date, conditions, response deadline and
recorded outcome. Sending or replying is separate from merely drafting or logging terms.
- Pick: an employment offer and its response. Not a discount (commerce `Promo`), terms signed once
  (customers `Agreement`), a quote for a client (customers `Invoice[quote]`), or pay alone (`Amount`).
- Writes: `offerId` and `applicationId` text(32), `candidate` text(24), `role` and `employer` text(32),
  `pay` number ≥ 0, `per` (`hour`, `month`, `year`), `hoursPerWeek` number > 0 and ≤ 80,
  `start` date, `respondBy` date optional, `conditions` text(100) each 0–6,
  `status` (`draft`, `sent`, `accepted`, `declined`, `withdrawn`), `goto` (edit form), `style`.
- Styles: `letter` (default), `card` (condensed terms).
- Parts → actions: `edit press`, `send send`, `accept press`, `decline press`, `withdraw press`.
- States: filled, loading, success (sent or response recorded), error (send or reply failed).
- Real path: draft or manually logged terms on the phone; sending needs email or another service, and an
  actual applicant response needs a shared app. No electronic signature, payroll or contract generation.
- Metadata: `meta.partTiers: { send: "service", accept: "people", decline: "people", withdraw: "service" }`,
  `meta.confirmParts: ["decline", "withdraw"]`. Code computes expiry and formats pay using the brief's
  currency; acceptance never implies hired. Withdraw is offered only for sent offers and sends a notice;
  discarding a local draft uses core `Button` with `confirm`, not an outbound action.

### `Applications` · planned · data · phone
A job seeker's tracker: employer, role, stage, last contact and a dated next action per application.
Follow-ups due today or overdue rise to the top; outcomes remain visible in history.
- Pick: my applications to several employers and when to follow up. Not an employer reviewing people
  (`ApplicantPipeline`), a general list (`List`), or jobs to tick off (`Checklist`).
- Writes: `applications` of `applicationId` text(32), `role` text(32), `employer` text(32),
  `stage` (`saved`, `applied`, `screening`, `interview`, `offer`), `outcome` (the `ApplicantPipeline` enum),
  `applied` date optional (absent for saved roles), `lastContact` date optional, `next` text(36) optional,
  `nextAt` date optional (requires `next`), `goto`, 1–6; `style`.
- Styles: `rows` (default), `cards` (same records with more space).
- Parts → actions: items `root press`, items `followup check`, items `withdraw press`.
- States: filled, empty, loading, success (follow-up logged), error (save failed).
- Real path: applications and contact events stored on the seeker's phone; checking a follow-up logs it
  and clears its next action/date, without sending anything or changing the hiring stage.
- Metadata: `meta.confirmParts: ["withdraw"]`. Code derives due notices, order and elapsed days;
  no model-written totals or urgency badges. Withdrawal here is a local recorded outcome, not a notice.

## Archetypes (4)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `hiring_openings` | Open roles and one role's terms | `hiring_roles`, `hiring_post` | `hiring_roles`: Header, Search, Chips, List, Button · `hiring_post`: Header[back], JobPost, Note |
| `hiring_pipeline` | Recruiting for one opening | `hiring_stages`, `hiring_interview_day` | `hiring_stages`: Header, Chips, ApplicantPipeline, Button · `hiring_interview_day`: Header, Calendar[week], Timeline[hours], Note |
| `hiring_candidate` | Review, meet and make an offer | `hiring_review`, `hiring_meeting`, `hiring_terms` | `hiring_review`: Header[back], Candidate, KeyValue, Checklist, Button · `hiring_meeting`: Header[back], Interview, KeyValue, Composer[entry], Button · `hiring_terms`: Header[back], Offer, Amount, Note |
| `hiring_job_hunt` | My applications and follow-ups | `hiring_tracker`, `hiring_application` | `hiring_tracker`: Header, Search, Chips, Applications, Button · `hiring_application`: Header[back], Applications[cards], Timeline[history], Offer |

Layout ids are hiring-prefixed to be unique across packs; each archetype's `defaultLayout` is its first
listed layout. The application layout binds one selected application and shows its offer only if present;
otherwise `Note` explains the next action. Core `form` edits records, and core `success` confirms saves.

## Worked example: Trot, recruiting

The dog walker needs a second walker for summer. `hiring_openings/hiring_roles` lists two openings; a
`JobPost` sets an hourly pay range and closing date. `hiring_pipeline/hiring_stages` groups eight applicants.
Sam's `Candidate` records evidence for handling groups and availability, then opens a confirmed
`Interview` on `hiring_candidate/hiring_meeting`. An `Offer` proposes 20 hours a week and a start date;
the walker records hired only after agreement. Signature: `day_unfold` on the interview day's hour rail.

A second take, **Next Step**, tracks six roles on `hiring_job_hunt/hiring_tracker`; a follow-up tick logs
contact, while `hiring_application` shows one application's history and any received offer.

## Tiers

All six components' main use is `phone`: locally entered records and decisions. Publishing, invitations,
call links, sending offers and notifying withdrawal are `service` parts; actual offer replies are
`people` parts. The host owns permissions and hides unavailable actions, never the Writer.

## Build notes

- Order: `JobPost`, `Applications`, `Candidate`, `ApplicantPipeline`, `Interview`, `Offer`.
- No pack imports another. Recruiting stops at hired; staff, shifts and payroll stay outside this pack.
- One host application record backs stage/outcome across views; validate repeated seed records for
  consistency. Dates are `YYYY-MM-DD`; meeting times use the brief's local time zone.
- Except the dense pipeline, weight is 2 and rows stop at six; overflow uses shared copy and a
  host-computed count, never a second model-written total. Dense pipeline reads one applicant per line.
- Writers use `writerFormat(registry)` over core plus hiring, strict bounded schemas and no aliases.
  Defaults use shared cast/copy helpers, neutral placeholders for an empty cast and kit bases only.
- Each future component ships two domain examples, probes and state/part checks. `example.jsonl` covers
  all six, validates and renders in three presets; recipes stay within count and weight limits.
- Confirmation uses shared `confirmParts` dispatch; its pending runtime support remains an implementation
  gate. Outbound actions never fire from a seed status. No new signature is proposed.

## Open questions

- **Job-board imports, CV files, calendar sync?** Default: host features, not pack components or dependencies.
- **Custom hiring stages?** Default: the four active stages above; terminal outcomes are separate.
- **Offer responses without a shared app?** Default: manually log the received answer through core `form`;
  do not present a local status change as a delivered acceptance or decline.
- **New action names?** None: navigation/decisions use `press`, edits `type`/`select`, bookmarks `toggle`,
  follow-ups `check`, stages `move`, and outbound messages `send`.
- **Wave?** To be decided from hiring misses; do not include this planned pack in live prompts.
