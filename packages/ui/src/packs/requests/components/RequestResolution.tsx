import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { resolutionHeading, resolutionReading, reviewBlocker } from "../copy";
import { requestsWordsFor, type RequestsWords } from "../lang";

const outcomes = ["repaired", "workaround", "unable", "duplicate"] as const;
const maxReason = 120;
const photoParts = ["photos", "photo_2", "photo_3", "photo_4"] as const;

// Core first: Success/screen cannot verify repair evidence or reopen the original request.
// prettier-ignore
export const meta = {
  id: "RequestResolution", status: "ready", group: "action",
  purpose: "Verify a repair outcome, accept it or reopen the original request.",
  pick: "Propose, verify, accept or reopen a service ticket outcome with evidence and checks after linked work. Not a success message (Success), a star rating (Scale), or accepting contract terms (Agreement).",
  writeHints: [
    "unable and duplicate require a reason; duplicateOf is required only for duplicate. Reopening also needs a reason at action time.",
    "Use review for a proposed outcome and receipt for the saved outcome. The host gates actions on roles and linked work; never write completion or acceptance flags.",
    'If asked to keep the evidence references but not show the photos, set media "none". Use null for all unrequested variant axes.',
  ],
  region: "body", weight: 2, tier: "phone",
  partTiers: { accept: "people", reopen: "people" }, confirmParts: ["resolve"],
  realPath: "A resolution is saved on the operator's device; acceptance and reopening need a shared app.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"], media: ["thumb", "none"] },
  variantParts: { "media.none": { hides: photoParts } },
  parts: ["root", "number", "outcome", "summary", "duplicate_of", ...photoParts,
    "resolve", "resolve_label", "accept", "accept_label", "saved_reason", "reason", "reopen", "reopen_label"],
  items: { key: "checks", parts: ["root", "text", "check"] },
  states: ["filled", "loading", "success", "error"],
  actions: {
    parts: { outcome: ["select"], resolve: ["press"], accept: ["press"], reason: ["type"], reopen: ["press"] },
    items: { check: ["check"] },
    when: {
      outcome: { canEdit: true }, check: { canEdit: true }, resolve: { canResolve: true },
      accept: { canAccept: true }, reason: { canEnterReason: true }, reopen: { canReopen: true },
    },
  },
  successActions: ["reason.type", "reopen.press"],
  selections: { outcome: { prop: "outcome", choices: { prop: "outcome_choices" }, runtime: true } },
  live: { text: { reason: { prop: "liveReason", max: maxReason } }, checks: { check: "done" }, derive: resolutionGates },
  readSuccess: true, read: resolutionReading,
} as const satisfies c.Meta;

// prettier-ignore
export const props = z.strictObject({
    ...c.variantProps(meta.variants),
    number: c.text(12), outcome: z.enum(outcomes).default("repaired"), summary: c.text(120),
    duplicateOf: c.text(12).meta({ kind: undefined }).optional(),
    checks: z.array(z.strictObject({ text: c.text(36), done: z.boolean() })).min(1).max(6),
    photos: z.array(c.photo).min(0).max(4),
    reason: c.text(maxReason).meta({ kind: undefined }).optional(),
    style: z.enum(["review", "receipt"]).default("review"),
  })
  .refine(
    ({ outcome, duplicateOf, number }) =>
      outcome === "duplicate" ? Boolean(duplicateOf && duplicateOf !== number) : duplicateOf === undefined,
    { path: ["duplicateOf"] })
  .refine(({ outcome, reason }) => !["unable", "duplicate"].includes(outcome) || Boolean(reason), { path: ["reason"] });

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast),
    item = c.itemsOf(cast, 1)[0];
  return {
    number: c.placeholderValue,
    summary: (item && c.detailOf(item, 120, thing)) || c.wordsFor(lang).placeholderDetail,
    checks: [{ text: (item && c.titleOf(item, 36, thing)) || c.placeholderTitle(0, lang), done: false }],
    photos: [],
  };
}

// prettier-ignore
export const examples = [
  { number: "LG-41", summary: "Replaced the grow light and checked its timer.", checks: [{ text: "Timer switches the light off", done: true }], photos: ["local:2"] },
  { number: "TR-08", outcome: "duplicate", duplicateOf: "TR-07", summary: "The existing request covers this gate.", checks: [{ text: "Confirmed it is the same latch", done: true }], photos: [], reason: "Both reports cover the dog run gate.", style: "receipt", density: "compact", surface: "outlined" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("RequestResolution");
// prettier-ignore
export const probes = [
  choose("Let us propose a fix with evidence and verification checks, then let the requester accept it or reopen the same ticket if it failed"),
  choose("Show a simple confirmation screen that says the report was sent successfully, with no further decisions", "Success"),
  write("Propose a repaired outcome for LG-41: Replaced the grow light and checked its timer. Verify Timer switches the light off, checked. Evidence is local:2."),
  { ...write("For LG-41 propose the grow light repair with a completed timer check. Keep evidence local:2 on the record but do not display the photo."),
    variant: { axis: "media", value: "none" } },
  read("Save the proposed fix for the grow light", { address: "r1/resolve", action: "press" }),
  read("Accept the saved outcome for TR-08", { address: "r1/accept", action: "press" }, 1),
] satisfies c.Probe[];

type Props = c.Props<typeof props, typeof meta>;
type Density = c.AxisValue<"density">;
type Words = RequestsWords["resolution"];
// prettier-ignore
type HostFacts = { staff: boolean; requester: boolean; workComplete: boolean; saved: boolean; resolved: boolean;
  duplicateMatches: (target: string) => boolean };
type View = Props & ReturnType<typeof deriveResolution> & { liveReason?: string };

/** Bind the instance to fresh role, work and canonical triage facts before enabling real actions. */
export function requestResolutionGates(facts: (instance: string) => HostFacts | undefined) {
  return (input: c.Values, instance: string) => deriveResolution(input, facts(instance));
}

// prettier-ignore
function deriveResolution(input: c.Values, facts: HostFacts | undefined) {
  const { style, outcome, number, duplicateOf, checks, reason, liveReason } = input as Props & { liveReason?: string };
  const canEdit = style === "review" && facts?.staff === true;
  const receipt = style === "receipt" && facts?.requester === true && facts.saved;
  const hasReason = Boolean((liveReason ?? reason)?.trim());
  const matched = Boolean(duplicateOf && duplicateOf !== number && facts?.duplicateMatches(duplicateOf));
  const outcome_choices = outcomes.filter((value) => value === "duplicate" ? matched && hasReason : value !== "unable" || hasReason);
  return {
    canEdit, matched, outcome_choices,
    canResolve: canEdit && outcome_choices.includes(outcome) && (outcome === "unable" || outcome === "duplicate" || facts.workComplete),
    canAccept: receipt && facts.resolved && checks.every(({ done }) => done),
    canEnterReason: canEdit || receipt, canReopen: receipt && Boolean(liveReason?.trim()),
  };
}

// The unbound catalog is a local preview, not authority to commit a resolution.
// prettier-ignore
function resolutionGates(input: c.Values): c.Values {
  return deriveResolution(input, { staff: true, requester: true, workComplete: true,
    saved: true, resolved: true, duplicateMatches: () => true });
}

// prettier-ignore
function Evidence({ photos, density, w }: { photos: string[]; density: Density; w: Words }) {
  return <kit.KitContent group="response" density={density}>
    <kit.KitText part={null} role="label" tone="muted">{w.evidence}</kit.KitText>
    <kit.KitGrid columns={3} density={density}>{photos.map((photo, index) =>
      <kit.KitPhoto key={photoParts[index]} part={photoParts[index]!} shape="square" photo={photo} label={w.evidence} />)}</kit.KitGrid>
  </kit.KitContent>;
}

// prettier-ignore
function Decision({ p, w, density, accepted }: { p: View; w: Words; density: Density; accepted: boolean }) {
  const review = p.style === "review", reason = review ? (p.liveReason ?? p.reason) : p.liveReason;
  const label = review ? w.reason : w.reopenReason;
  return <kit.KitContent group="response" density={density}>
    {!review && !accepted && p.canEnterReason && p.checks.some(({ done }) => !done) &&
      <kit.KitText part={null} role="label" tone="muted">{w.verificationPending}</kit.KitText>}
    {!review && !accepted && <kit.KitAction full part="accept" label={w.accept} disabled={!p.canAccept} />}
    {p.canEnterReason && (!accepted || !review) && <>
      <kit.KitText part={null} role="label" tone="muted">{label}</kit.KitText>
      <kit.KitTextArea part="reason" {...{ label }} hint={review ? w.reasonHint : w.reopenHint}
        value={reason} maxLength={maxReason} lines={1} />
    </>}
    {review && !accepted && <>
      {!p.canResolve && <kit.KitText part={null} role="label" tone="muted">{reviewBlocker(p, w)}</kit.KitText>}
      <kit.KitAction full part="resolve" label={w.resolve} disabled={!p.canResolve} />
    </>}
    {!review && p.canEnterReason && <kit.KitAction full part="reopen" label={w.reopen}
      kind="quiet" disabled={!p.canReopen} />}
  </kit.KitContent>;
}

// prettier-ignore
export function RequestResolution(input: Props) {
  const state = kit.useComponentState(), { words: { resolution: w } } = kit.useWords(requestsWordsFor);
  const density = kit.useVariant("density", meta.variants.density, input.density),
    surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const media = kit.useVariant("media", meta.variants.media, input.media);
  const p = kit.useLiveControls(meta, input) as View, accepted = state === "success";
  const title = resolutionHeading(p.style, state, w);
  const evidence = media !== "none" && p.photos.length > 0, editable = !accepted && p.canEdit;
  if (state === "loading") return <kit.KitCard padded {...{ density, surface }} part="root">
    <kit.KitSkeleton shape="figure" inset="none" {...{ density }}
      content={[[ "number", p.number, "start", "compact" ], ["heading", title], ["body", p.summary]]} />
    {evidence && <kit.KitGrid columns={3} density={density}>{p.photos.map((_, index) =>
      <kit.KitSkeleton key={index} shape="media" aspect="square" />)}</kit.KitGrid>}
    <kit.KitSkeleton rows={p.checks.length} lead="box" inset="none" density={density} />
    <kit.KitSkeleton shape="control" label={p.style === "review" ? w.resolve : w.accept} full />
  </kit.KitCard>;
  return <kit.KitCard padded {...{ density, surface }} part="root">
    <kit.KitContent density={density}>
      <kit.KitText part="number" role="number" numberScale="compact" tone="muted" tabular>{p.number}</kit.KitText>
      <kit.KitText part={null} role="heading" tone={accepted ? "good" : state === "error" ? "bad" : "text"}>{title}</kit.KitText>
      {state === "error" ? <kit.KitText part={null} role="body" tone="muted">{w.errorHint}</kit.KitText> :
        <kit.KitText part="summary" role="body">{p.summary}</kit.KitText>}
    </kit.KitContent>
    {state !== "error" && <>
      {editable ? <kit.KitTrack part="outcome" label={w.outcome} role="radiogroup">
        {outcomes.filter((value) => value === p.outcome || p.outcome_choices.includes(value)).map((value) =>
          <kit.KitChip key={value} item={null} {...{ value }} label={w.outcomes[value]} role="radio"
            on={p.outcome === value} disabled={!p.outcome_choices.includes(value)} />)}
      </kit.KitTrack> : <kit.KitText part="outcome" role="label" tone="muted">{w.result(w.outcomes[p.outcome])}</kit.KitText>}
      {p.outcome === "duplicate" && p.duplicateOf && <kit.KitText part="duplicate_of" role="body">{w.duplicateOf(p.duplicateOf)}</kit.KitText>}
      {p.reason && !editable && <kit.KitText part="saved_reason" role="body">{p.reason}</kit.KitText>}
      {evidence && <Evidence {...{ density, w }} photos={p.photos} />}
      <kit.KitContent group="response" density={density}>
        <kit.KitText part={null} role="label" tone="muted">{w.verify}</kit.KitText>
        {p.checks.map(({ id, text, done }) => <kit.KitRow key={id} item={id} part="root" inline label={text}
          leadingAlign="row" leading={<kit.KitCheck part="check" {...{ done }} label={editable ? text : w.checkLabel(text, done)} readonly={!editable} />}>
          <kit.KitText part="text" role="body">{text}</kit.KitText>
        </kit.KitRow>)}
      </kit.KitContent>
      {(!accepted || p.style === "receipt") && <Decision {...{ p, w, density, accepted }} />}
    </>}
  </kit.KitCard>;
}
