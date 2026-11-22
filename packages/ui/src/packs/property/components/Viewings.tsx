import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
// prettier-ignore
import { orderedViewings, outcomes, viewingActions, viewingGates, viewingReading, viewingTimes, type Viewing } from "../copy";
import { propertyWordsFor } from "../lang";
import { dateTime, distinct, ref, seedLabels, seedTime } from "../seeds";
import { prompt } from "../../../entry/prompt-Viewings.generated";
const maxViewings = 6;
const recordRef = ref.meta({ kind: "id" });

// Core first: Timeline/hours cannot tie a prospect to a unit or record attendance and invitations.
// prettier-ignore
export const meta = {
  id: "Viewings",
  status: "ready",
  group: "content",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Agreed appointments live on the agent’s phone; invitations use messaging, not booking sync.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "plain"], detail: ["brief", "full"] },
  variantParts: { "detail.full": { adds: ["note"] } },
  parts: ["root", "message"],
  items: { key: "viewings", parts: ["root", "unit", "prospect", "start", "end", "status",
    "note", "past", "actions", "edit", "confirm", "cancel", "outcome", "invite"] },
  partTiers: { invite: "service" },
  confirmParts: ["cancel"],
  states: ["filled", "empty", "loading", "success", "error"],
  actions: {
    items: { edit: ["press"], confirm: ["press"], cancel: ["press"], outcome: ["select"], invite: ["send"] },
    noGoto: { items: ["confirm", "cancel"] },
    when: {
      edit: { upcoming: true }, confirm: { upcoming: true, status: "proposed" }, invite: { upcoming: true },
      cancel: { active: true }, outcome: { canRecord: true },
    },
  },
  readSuccess: true,
  read: (input, state, lang) => viewingReading((input as { viewings: Viewing[] }).viewings, state, lang),
} as const satisfies c.Meta;

// prettier-ignore
const viewing = z.strictObject({
  viewingRef: recordRef, unitRef: recordRef, unit: c.text(32), prospect: c.text(24), start: dateTime,
  minutes: z.int().min(5).max(180), status: z.enum(["proposed", "confirmed", "attended", "no_show", "cancelled"]),
  note: c.text(36).optional(), goto: c.screenId,
}).refine(({ start, status }) => Date.parse(start) <= Date.now() || (status !== "attended" && status !== "no_show"),
  { path: ["status"], message: "Record attendance only after the viewing has started" });

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    viewings: z.array(viewing).min(1).max(maxViewings),
  })
  .refine(({ viewings }) => distinct(viewings, ({ viewingRef }) => viewingRef), { path: ["viewings"] })
  .overwrite((value) => {
    const now = Date.now();
    return {
      ...value,
      viewings: value.viewings.map((record) => ({
        ...record,
        outcome: {},
        ...viewingGates(record, now),
        note: value.detail === "full" ? record.note : undefined,
      })),
    };
  });

// prettier-ignore
export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return {
    viewings: seedLabels(input).map(({ ref, title, short }) => ({
      viewingRef: `${ref}_view`, unitRef: ref, unit: title, prospect: short, start: seedTime,
      minutes: 30, status: "proposed", goto: "details",
    })),
  };
}

// prettier-ignore
export const examples = [
  { viewings: [
    { viewingRef: "cedar_view", unitRef: "flat_b", unit: "Cedar Flat", prospect: "Noor", start: "2028-11-21T10:30:00+01:00", minutes: 20, status: "confirmed", note: "Meet at the courtyard gate.", goto: "edit_viewing" },
    { viewingRef: "willow_view", unitRef: "flat_c", unit: "Willow Loft", prospect: "Tessa", start: "2028-11-21T09:00:00+01:00", minutes: 30, status: "proposed", goto: "edit_viewing" },
  ] },
  { viewings: [
    { viewingRef: "cabin_view", unitRef: "north_cabin", unit: "North Cabin", prospect: "Lee", start: "2026-10-17T14:00:00+01:00", minutes: 30, status: "no_show", note: "Waited at the east gate.", goto: "edit_viewing" },
  ] },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Viewings");
// prettier-ignore
export const probes = [
  choose("Track property showings with which rental unit and prospect, then log whether they attended or didn't show up"),
  choose("Show today's timed agenda along an hour rail, sized by start and end times so I can spot free gaps", "Timeline"),
  write("Add proposed showing cedar_view, Cedar Flat (flat_b) for Noor, on 2026-11-21 at 10:30+01:00 for 20 minutes. Edit at edit_viewing."),
  {
    ...write(
      "Show attended cabin_view for Lee at North Cabin (north_cabin), 2026-10-17 at 14:00+01:00, 30 minutes, edit at edit_viewing. Show all details including the note 'Met at the east gate.'",
    ),
    variant: { axis: "detail", value: "full" },
  },
  read("Record the attendance outcome of Lee’s past viewing", { address: "v1/r1/outcome", action: "select" }, 1),
] satisfies c.Probe[];

type ViewingsProps = c.Props<typeof props, typeof meta>;
type RowProps = { row: ViewingsProps["viewings"][number] & Viewing; density: c.ThemeDensity };
// prettier-ignore
function RecordAction({ part, label, goto, loading }: {
  part: string; label: string; goto?: string; loading: boolean;
}) {
  return <kit.KitRow surface="plain" part={loading ? null : part} label={loading ? "" : label} role={loading ? "text" : "button"} goto={loading ? undefined : goto}>
    {loading ? <kit.KitSkeleton shape="figure" inset="none" content={[["label", label]]} /> :
      <kit.KitText part={null} role="label" tone="muted">{label}</kit.KitText>}
  </kit.KitRow>;
}

// prettier-ignore
function ViewingControls({ row, density, loading = false }: RowProps & { loading?: boolean }) {
  const { words: { viewings: words } } = kit.useWords(propertyWordsFor);
  const { screen, component } = kit.usePartContext();
  const value = kit.useControlValue<unknown>(`${screen}/${component}/${row.id}/outcome`, row.status);
  const selected = value === "attended" || value === "no_show" ? value : row.status;
  const { confirm, invite, edit, cancel } = viewingActions(row);
  return (invite || cancel || row.canRecord) ? <kit.KitContent group="response" density={density}>
    {row.canRecord && (loading ? <kit.KitSkeleton shape="figure" inset="none" content={[["label", words.outcome]]} /> : <>
      <kit.KitText role="label" tone="muted" part={null} {...{ density }}>{words.outcome}</kit.KitText>
      <kit.KitTrack part="outcome" role="radiogroup" label={words.outcome}>
        {outcomes.map((value) => <kit.KitChip key={value} item={null} role="radio" value={value} on={selected === value} label={words.statuses[value]} />)}
      </kit.KitTrack>
    </>)}
    {(invite || cancel) && <kit.KitTrack part="actions">
      {invite && <RecordAction part="invite" label={words.actions.invite} {...{ loading }} />}
      {edit && <RecordAction part="edit" label={words.actions.edit} goto={row.goto} {...{ loading }} />}
      {cancel && <RecordAction part="cancel" label={words.actions.cancel} {...{ loading }} />}
      {confirm && <kit.KitAction part="confirm" label={words.actions.confirm} />}
    </kit.KitTrack>}
  </kit.KitContent> : null;
}

// prettier-ignore
const statusTone = { proposed: "muted", confirmed: "good", attended: "good", no_show: "warn", cancelled: "muted" } as const;
// prettier-ignore
function ViewingRow({ row, density, surface, state }: RowProps & { surface: ViewingsProps["surface"]; state: c.StateName }) {
  const { lang, words: { viewings: words } } = kit.useWords(propertyWordsFor);
  const scope = kit.usePartContext();
  return <kit.PartScope {...scope} item={row.id}><kit.KitCard padded {...{ density, surface }} part="root" label={state === "loading" ? "" : row.unit}>
    <ViewingDetails {...{ row, density, state, lang, words }} />
  </kit.KitCard></kit.PartScope>;
}

// prettier-ignore
function ViewingDetails({ row, density, state, lang, words }: RowProps & {
  state: c.StateName; lang: string; words: ReturnType<typeof propertyWordsFor>["viewings"];
}) {
  const { startLabel, endLabel } = viewingTimes(row.start, row.minutes, lang);
  const badge = <kit.KitTrail kind="badge" part="status" value={words.statuses[row.status]} tone={statusTone[row.status]} {...{ density }} />;
  const loading = state === "loading";
  return <>
    <kit.KitGrid fitLast {...{ density }}>
      {loading ? <kit.KitSkeleton shape="figure" inset="none" {...{ density }} content={[["title", row.unit], ["body", row.prospect]]} /> :
      <kit.KitContent {...{ density }}>
        <kit.KitText part="unit" role="title" {...{ density }}>{row.unit}</kit.KitText>
        <kit.KitText part="prospect" role="body" tone="muted" {...{ density }}>{row.prospect}</kit.KitText>
      </kit.KitContent>}
      {badge}
    </kit.KitGrid>
    {loading ? <kit.KitSkeleton shape="figure" inset="none" {...{ density }} content={[["number", startLabel, "start", "compact"], ["label", endLabel]]} /> :
    <kit.KitContent {...{ density }}>
      <kit.KitText part="start" role="number" tone="muted" numberScale="compact" tabular {...{ density }}>{startLabel}</kit.KitText>
      <kit.KitText part="end" role="label" tone="muted" {...{ density }}>{endLabel}</kit.KitText>
      {row.active && !row.upcoming && <kit.KitText part="past" role="label" tone="muted" {...{ density }}>{words.past}</kit.KitText>}
      {row.note && <kit.KitText part="note" role="body" tone="muted" {...{ density }}>{row.note}</kit.KitText>}
    </kit.KitContent>}
    {(state === "filled" || loading) && <ViewingControls {...{ row, density, loading }} />}
  </>;
}

// prettier-ignore
export function Viewings(input: ViewingsProps) {
  const state = kit.useComponentState();
  const thing = kit.useEmptyThing();
  const { words: { viewings: words } } = kit.useWords(propertyWordsFor);
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  return <kit.KitCard part="root" style="cards" {...{ density }}>
    {state === "empty" ? <kit.KitEmpty icon="calendar" {...(!thing ? { title: words.empty } : {})} part="message" decorativeIcon /> : <>
      {(state === "success" || state === "error") && <kit.KitContent inset="md">
        <kit.KitText part="message" role="body" tone={state === "success" ? "good" : "bad"}>{words[state]}</kit.KitText>
      </kit.KitContent>}
      <kit.KitGrid list listRowGap="cards" arrange="rows" {...{ density }}>
        {orderedViewings(input.viewings as RowProps["row"][]).map((row) => <ViewingRow key={row.id} {...{ row, density, surface, state }} />)}
      </kit.KitGrid>
    </>}
  </kit.KitCard>;
}
