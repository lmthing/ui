import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { resolutionHeading, resolutionReading, reviewBlocker } from "../copy";
import { requestsWordsFor, type RequestsWords } from "../lang";

const outcomes = ["repaired", "workaround", "unable", "duplicate"] as const;
const maxReason = 120,
  photoParts = ["photos", "photo_2", "photo_3", "photo_4"] as const;

// Core first: Success/screen cannot verify repair evidence or reopen the original request.
// prettier-ignore
export const meta = {
  id: "RequestResolution", status: "ready", group: "action",
  purpose: "Verify a repair outcome, accept it or reopen the original request.",
  pick: "Save a proposed repair outcome with evidence and verification checks, then let the requester accept it or reopen the same service ticket. Not a conversation or status updates (RequestThread), a success message (Success), a star rating (Scale), or contract terms (Agreement).",
  writeHints: [
    "unable and duplicate require a reason; duplicateOf is required only for duplicate. Reopening also needs a reason at action time.",
    "Use review for a proposed outcome and receipt for the saved outcome. The host gates actions on roles and linked work; never write completion or acceptance flags.",
    'For hidden photos, keep all evidence references and use media "none", density null, surface null unless spacing or surface is requested.',
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
  photos: z.array(c.photo).min(0).max(photoParts.length),
  reason: c.text(maxReason).meta({ kind: undefined }).optional(),
  style: z.enum(["review", "receipt"]).default("review"),
})
  .refine(({ outcome, duplicateOf, number }) =>
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
  { number: "LG-41", summary: "Replaced the grow light.", checks: [{ text: "Timer shuts off the light", done: true }], photos: ["local:2"] },
  { number: "TR-08", outcome: "duplicate", duplicateOf: "TR-07", summary: "Linked to the first report.", checks: [{ text: "Matched the gate latch", done: true }], photos: [], reason: "Both report a loose latch.", style: "receipt" },
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

// The unbound catalog previews actions only.
// prettier-ignore
function resolutionGates(input: c.Values): c.Values {
  return deriveResolution(input, { staff: true, requester: true, workComplete: true,
    saved: true, resolved: true, duplicateMatches: () => true });
}

// prettier-ignore
function Evidence({ photos, density, w, loading }: { photos: string[]; density: Density; w: Words; loading: boolean }) {
  return <kit.KitContent group={density === "compact" ? "content" : "response"} density={density}>
    {loading ? <kit.KitSkeleton shape="figure" inset="none" content={[["label", w.evidence]]} />
      : <kit.KitText part={null} role="label" tone="muted">{w.evidence}</kit.KitText>}
    <kit.KitGrid columns={3} density={density}>{photos.map((photo, index) => loading
      ? <kit.KitSkeleton key={photoParts[index]} shape="media" aspect="square" content={[]} inset="none" />
      : <kit.KitPhoto key={photoParts[index]} part={photoParts[index]!} shape="square" photo={photo} label={w.evidence} />)}</kit.KitGrid>
  </kit.KitContent>;
}

// prettier-ignore
function Decision({ p, w, density, accepted, loading }: { p: View; w: Words; density: Density; accepted: boolean; loading: boolean }) {
  const review = p.style === "review", reason = review ? (p.liveReason ?? p.reason) : p.liveReason;
  const label = review ? w.reason : w.reopenReason, hint = review ? w.reasonHint : w.reopenHint;
  const field = loading ? <><kit.KitSkeleton shape="figure" inset="none" content={[["label", label]]} />
    <kit.KitRow label={label} tone="muted" inline><kit.KitSkeleton shape="figure" inset="md" content={[["body", hint]]} /></kit.KitRow></> :
    <><kit.KitText part={null} role="label" tone="muted">{label}</kit.KitText>
    <kit.KitTextArea part="reason" {...{ label, hint }} value={reason} maxLength={maxReason} lines={1} /></>;
  return <kit.KitContent group={density === "compact" ? "content" : "response"} density={density}>
    {!review && !accepted && !loading && p.canEnterReason && p.checks.some(({ done }) => !done) &&
      <kit.KitText part={null} role="label" tone="muted">{w.verificationPending}</kit.KitText>}
    {!review && !accepted && (loading ? <kit.KitSkeleton shape="control" label={w.accept} full />
      : <kit.KitAction full part="accept" label={w.accept} disabled={!p.canAccept} />)}
    {p.canEnterReason && (!accepted || !review) && <kit.KitContent group={review || accepted ? "content" : "response"} density={density}>
      {field}{!review && (loading ? <kit.KitSkeleton shape="control" label={w.reopen} kind="quiet" full />
        : <kit.KitAction full part="reopen" label={w.reopen} kind="quiet" disabled={!p.canReopen} />)}
    </kit.KitContent>}
    {review && !accepted && <kit.KitContent group="response" density={density}>
      {loading ? <kit.KitSkeleton shape="control" label={w.resolve} full /> : <>
        {!p.canResolve && <kit.KitText part={null} role="label" tone="muted">{reviewBlocker(p, w)}</kit.KitText>}
        <kit.KitAction full part="resolve" label={w.resolve} disabled={!p.canResolve} /></>}
    </kit.KitContent>}
  </kit.KitContent>;
}

// prettier-ignore
export function RequestResolution(input: Props) {
  const state = kit.useComponentState(), { words: { resolution: w } } = kit.useWords(requestsWordsFor);
  const density = kit.useVariant("density", meta.variants.density, input.density), surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const media = kit.useVariant("media", meta.variants.media, input.media);
  const p = kit.useLiveControls(meta, input) as View, accepted = state === "success";
  const title = resolutionHeading(p.style, state, w), evidence = media !== "none" && p.photos.length > 0;
  const editable = !accepted && p.canEdit, loading = state === "loading", review = p.style === "review";
  return <kit.KitCard padded {...{ density, surface }} part="root">
    {loading ? <kit.KitSkeleton shape="figure" inset="none" {...{ density }}
      content={[["label", p.number], ["heading", title], ["body", p.summary]]} /> : <kit.KitContent density={density}>
      <kit.KitText part="number" role="label" tone="muted">{p.number}</kit.KitText>
      <kit.KitText part={null} role="heading" tone={accepted ? "good" : state === "error" ? "bad" : "text"}>{title}</kit.KitText>
      {state === "error" ? <kit.KitText part={null} role="body" tone="muted">{w.errorHint}</kit.KitText> :
        <kit.KitText part="summary" role="body">{p.summary}</kit.KitText>}
    </kit.KitContent>}
    {state !== "error" && <>
      {editable ? <kit.KitTrack part="outcome" label={w.outcome} role="radiogroup">
        {outcomes.filter((value) => value === p.outcome || p.outcome_choices.includes(value)).map((value) =>
          <kit.KitChip key={value} item={null} {...{ value }} label={w.outcomes[value]} role="radio"
            on={!loading && p.outcome === value} disabled={loading || !p.outcome_choices.includes(value)} />)}
      </kit.KitTrack> : loading ? <kit.KitSkeleton shape="figure" inset="none" content={[["label", w.result(w.outcomes[p.outcome])]]} />
        : <kit.KitText part="outcome" role="label" tone="muted">{w.result(w.outcomes[p.outcome])}</kit.KitText>}
      {!loading && p.outcome === "duplicate" && p.duplicateOf && <kit.KitText part="duplicate_of" role="body">{w.duplicateOf(p.duplicateOf)}</kit.KitText>}
      {!loading && p.reason && !editable && <kit.KitText part="saved_reason" role="label" tone="muted">{p.reason}</kit.KitText>}
      {evidence && <Evidence {...{ density, w, loading }} photos={p.photos} />}
      <kit.KitContent group={density === "compact" ? "content" : "response"} density={density}>
        {loading ? <><kit.KitSkeleton shape="figure" inset="none" content={[["label", w.verify]]} />
          <kit.KitSkeleton shape="options" look="list" items={p.checks.map(({ text }) => ({ title: text }))} /></>
          : <><kit.KitText part={null} role="label" tone="muted">{w.verify}</kit.KitText>
        {p.checks.map(({ id, text, done }) => <kit.KitRow key={id} item={id} part="root" inline label={editable ? text : w.checkLabel(text, done)}><kit.KitGrid fitLast density={density}>
          <kit.KitText part="text" role="body">{text}</kit.KitText>
          {editable ? <kit.KitCheck part="check" {...{ done }} label={text} /> :
            done ? <kit.KitTrail part="check" kind="check" tone="good" /> : <kit.KitIcon part="check" name="minus" tone="muted" decorative />}
        </kit.KitGrid></kit.KitRow>)}</>}
      </kit.KitContent>
      {(!accepted || !review) && <Decision {...{ p, w, density, accepted, loading }} />}
    </>}
  </kit.KitCard>;
}
