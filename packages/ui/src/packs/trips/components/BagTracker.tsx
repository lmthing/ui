import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { activeBag, bagReading, bagStageOrder, bagView, scanPart } from "../copy";
import { tripsWordsFor } from "../lang";

const refreshBags = {
  kind: "command",
  name: "refresh_bags",
  input: ({ props }: { props: Readonly<c.Values> }) => ({
    tags: JSON.stringify((props.bags as { tag: string }[]).map(({ tag }) => tag)),
  }),
} as const;
const scanParts = bagStageOrder.map((_, index) => scanPart(index));

// Core first: Steps/default guides the person through ordered steps, not airline scans, bags or carousel assignments.
// prettier-ignore
export const meta = {
  id: "BagTracker",
  status: "ready",
  group: "data",
  tier: "service",
  pick: "Track several checked bags by tag across airline scan checkpoints. Not guided steps (Steps), trip packing (PackingList), parcels (DeliveryTracker) or retail orders (OrderStatus).",
  purpose: "See where my checked bags were scanned and where to collect them.",
  writeHints: [
    "Use 1–4 distinct bag tags. Give each 1–6 unique scan stages in travel order: checked_in, security, loaded, in_transit, unloaded, carousel. Done means scanned; do not invent timestamps or locations.",
    'Use detail "brief" only when asked to show each bag’s latest scan and carousel rather than its history. Leave unrequested axes null; never write explicit defaults such as "card" or "comfortable".',
  ],
  region: "body",
  weight: 2,
  realPath:
    "baggage custody scans and carousel assignments synced from the airline's baggage-handling service.",
  parts: ["root", "heading", "selector", "notice", "refresh", "refresh_error", "report", "report_error"],
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": {
    hides: ["selector", "weight", "flight", "track", "next", ...scanParts], adds: ["latest", "tag"],
  } },
  items: { key: "bags", parts: ["root", "label", "tag", "weight", "flight", "carousel", "track", "latest", "next", ...scanParts] },
  actions: {
    parts: { refresh: ["press"], refresh_error: ["press"], report: ["press"], report_error: ["press"] },
    items: { root: ["select"] },
    when: { report: { canReport: true }, report_error: { canReport: true } },
  },
  select: { prop: "active", value: { field: "tag" }, mode: "flags", runtime: true },
  hostCommands: { parts: { "refresh.press": refreshBags, "refresh_error.press": refreshBags } },
  partTiers: { root: "phone", report: "ok", report_error: "ok", refresh: "service", refresh_error: "service" },
  errorActions: ["refresh_error.press", "report_error.press"],
  successActions: ["root.select", "refresh.press"],
  confirmParts: ["report", "report_error"],
  states: ["filled", "empty", "loading", "success", "error"],
  deviceData: ["baggage_feed"],
  previewDeviceData: ({ state }): c.DeviceData => state === "empty" ? { baggage_feed: [] } : {},
  readSuccess: true,
  read: (input, state, lang): string[] => state === "filled" || state === "success"
    ? bagReading(input as Parameters<typeof bagReading>[0], state === "success", lang)
    : state === "empty" ? [tripsWordsFor(lang).bagTracker.empty] : [],
} as const satisfies c.Meta;

const maxBags = 4;
// prettier-ignore
const scan = z.strictObject({ stage: z.enum(bagStageOrder), at: c.text(16).optional(), location: c.text(24).optional(), done: z.boolean() });
// prettier-ignore
const bag = z.strictObject({
  tag: c.text(16).meta({ kind: undefined }), label: c.text(24).optional(),
  weight: c.text(12).meta({ kind: undefined }).optional(), flight: c.text(10).meta({ kind: undefined }).optional(),
  carousel: c.text(12).meta({ kind: undefined }).optional(),
  steps: z
    .array(scan)
    .min(1)
    .max(bagStageOrder.length)
    .refine(
      (steps) =>
        steps.every(
          ({ stage }, index) =>
            index === 0 || bagStageOrder.indexOf(stage) > bagStageOrder.indexOf(steps[index - 1]!.stage),
        ),
      "Scan stages must be distinct and in travel order",
    ),
});

// prettier-ignore
export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  bags: z.array(bag).min(1).max(maxBags).refine((bags) =>
    new Set(bags.map(({ tag }) => tag)).size === bags.length, "Bag tags must be distinct"),
  reportGoto: c.screenId.optional(),
}).overwrite((input) => {
  const report = input.reportGoto ? { goto: input.reportGoto } : undefined;
  return { ...input, canReport: !!report, report, report_error: report };
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const labels = c.itemsOf(cast, maxBags).flatMap((item) => c.titleOf(item, 16, thing) ?? []);
  return {
    bags: [...new Set(labels.length ? labels : [c.placeholderTitle(0, lang)])].map((tag) => ({
      tag,
      steps: [{ stage: "checked_in", done: false }],
    })),
  };
}

// prettier-ignore
const japan = [
  { tag: "NH 674205", label: "Blue suitcase", weight: "18 kg", flight: "NH 212", carousel: "5",
    steps: [
      { stage: "checked_in", at: "16:50", location: "London Heathrow", done: true },
      { stage: "security", at: "17:10", location: "Terminal 2", done: true },
      { stage: "loaded", at: "18:42", location: "London Heathrow", done: true },
      { stage: "unloaded", at: "5 Mar 18:14", location: "Tokyo Haneda", done: true },
      { stage: "carousel", at: "5 Mar 18:31", location: "Terminal 3", done: true },
    ],
  },
  { tag: "NH 674206", label: "Black duffel", weight: "11 kg", flight: "NH 212", steps: [
    { stage: "checked_in", at: "16:52", location: "London Heathrow", done: true },
    { stage: "loaded", at: "18:43", location: "London Heathrow", done: true },
    { stage: "unloaded", done: false },
    { stage: "carousel", done: false },
  ] },
] satisfies z.input<typeof bag>[];

export const examples = [
  { bags: japan, reportGoto: "missing_bag" },
  { bags: japan, detail: "brief" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("BagTracker");
const brief =
  "Track checked suitcase tag NH 674205. It was checked in at 16:50 at Heathrow and loaded at 18:42. The unload and carousel scans haven't happened.";
// prettier-ignore
export const probes = [
  choose("Track my checked suitcase through airline bag-tag scans at check-in, loading and arrival, and tell me the carousel number."),
  choose("Guide me through a four-step registration form one screen at a time, with a progress header marking the current form step.", "Steps"),
  choose("Give me a trip packing checklist for socks and chargers, with boxes to tick and a total packed count.", "PackingList"),
  write(brief),
  { ...write(`${brief} In the display, hide the scan history and show only the latest status and carousel for each bag. No spacing or surface changes.`), variant: { axis: "detail", value: "brief" } },
  read("Switch to the black duffel, tag NH 674206.", { address: "b1/r2", action: "select" }),
  read("Open the confirmation for reporting a missing bag.", { address: "b1/report", action: "press" }),
] satisfies c.Probe[];

type BagProps = c.Props<typeof props, typeof meta>;
type Bag = BagProps["bags"][number];
type Density = c.ThemeDensity;

// prettier-ignore
function ScanDetails({ bag, density }: { bag: Bag; density: Density }) {
  const { lang, words: { bagTracker } } = kit.useWords(tripsWordsFor);
  const loading = kit.useComponentState() === "loading";
  const context = kit.usePartContext();
  const view = bagView(bag, lang);
  return <kit.PartScope {...context} item={bag.id}>
    <kit.KitContent density={density} group="response">
      <kit.KitGrid fitLast density={density}>
        <kit.KitMetaLine title={{ text: bagTracker.tag(bag.tag), part: "tag", role: "meta", strong: true }} meta={[
          { text: bag.flight && bagTracker.flight(bag.flight), part: "flight" }, { text: bag.weight, part: "weight" },
        ]} density={density} />
        {view.carousel && <kit.KitTrail kind="badge" value={view.carousel} part="carousel" tone="good" />}
      </kit.KitGrid>
    </kit.KitContent>
    <kit.KitContent density={density} group="response" rhythm="flush">
      <kit.KitStepsTrack part="track" style="dots" count={view.scans.length} at={loading ? 0 : view.trackAt} />
      {view.next && <kit.KitLayoutText line={{ text: view.next, part: "next", role: "meta", strong: true }} density={density} />}
      <kit.KitRowGroup density={density}>
        {view.scans.map(({ stage, part, note, time, done }) =>
          <kit.KitRow key={part} item={bag.id} part={loading ? null : part} label={stage} inset="none" lineRole="label" density={density}
            trailing={time && <kit.KitLayoutText line={{ text: time, role: "figure", compact: true, tabular: true }} align="end" density={density} />}>
            <kit.KitMetaLine title={{ text: stage, role: "meta", strong: done }} meta={{ text: note }} density={density} />
          </kit.KitRow>)}
      </kit.KitRowGroup>
    </kit.KitContent>
  </kit.PartScope>;
}

// prettier-ignore
function CompactBag({ bag, selected, density }: { bag: Bag; selected: boolean; density: Density }) {
  const { lang } = kit.useWords(tripsWordsFor);
  const state = kit.useComponentState(), loading = state === "loading";
  const view = bagView(bag, lang), interactive = state === "filled" || state === "success";
  return <kit.KitRow item={bag.id} part={loading ? null : "root"} label={bag.label ?? bag.tag} role={interactive ? "button" : "text"}
    selected={interactive && selected} lineRole="label" density={density}
    trailing={view.carousel && <kit.KitTrail kind="badge" value={view.carousel} part="carousel" tone="good" />}>
    <kit.KitMetaLine title={{ text: bag.label ?? bag.tag, part: "label", role: "meta", strong: true }}
      meta={[{ text: bag.label ? bag.tag : undefined, part: "tag" }, { text: view.latest, part: "latest" }]} density={density} />
  </kit.KitRow>;
}

// prettier-ignore
export function BagTracker(input: BagProps) {
  const { words: { bagTracker } } = kit.useWords(tripsWordsFor);
  const state = kit.useComponentState();
  const density = kit.useKit().density;
  const surface = "card";
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const { bags } = kit.useLiveControls(meta, input) as { bags: (Bag & { active?: boolean })[] };
  const selected = activeBag(bags);
  const failed = state === "error", loading = state === "loading";
  const report = input.reportGoto && state !== "success";
  const footer = <kit.KitActionFooter density={density}>
    <kit.KitAction part={failed ? "refresh_error" : "refresh"} action="press" kind="quiet" label={bagTracker.refresh} contentParts={{}} />
    {report && <kit.KitAction part={failed ? "report_error" : "report"} action="press" kind="danger"
      label={bagTracker.report} goto={input.reportGoto} contentParts={{}} />}
  </kit.KitActionFooter>;
  const body = <>
    <kit.KitHeader title={{ text: bagTracker.heading, part: "heading" }} density={density} />
    {detail === "brief" ? <kit.KitRowGroup density={density}>
      {bags.map((bag) => <CompactBag key={bag.id} bag={bag} selected={bag.id === selected.id} density={density} />)}
    </kit.KitRowGroup> : <>
      {!failed && <kit.KitTrack part="selector" label={bagTracker.selector} role="radiogroup">
        {bags.map((bag) => <kit.KitChip key={bag.id} item={bag.id} label={bag.label ?? bag.tag}
          labelPart="label" on={!loading && bag.id === selected.id} role="radio" disabled={loading || undefined} />)}
      </kit.KitTrack>}
      <ScanDetails bag={selected} density={density} />
    </>}
    {footer}
  </>;
  const message = failed ? bagTracker.error : state === "success" ? bagTracker.success : bagTracker.empty;
  return <kit.KitCard part="root" padded {...{ density, surface }}>
    <kit.KitState part="notice" loading={body} retain message={message} icon="package" density={density}>{body}</kit.KitState>
  </kit.KitCard>;
}
