import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
// prettier-ignore
import { inspectionChoices, inspectionConditions, inspectionDisplay, inspectionEditPath, inspectionEntries,
  inspectionNoteLimit, inspectionPhotoParts, inspectionProgress, inspectionSummary, readInspection } from "../copy";
import { propertyWordsFor } from "../lang";
import { dateTime, distinct, ref, seedDate, seedLabels } from "../seeds";
const recordRef = ref.meta({ kind: "ref" });

// Core first: Checklist/default cannot bind condition, notes and photographic evidence to a locked unit report.
// prettier-ignore
export const meta = {
  id: "Inspections",
  status: "draft",
  group: "input",
  purpose: "Record and sign off dated room conditions and evidence for a unit.",
  pick: "Dated room-by-room condition report with feature notes, photos, prior-report comparison and sign-off. Not jobs to tick (Checklist), photos alone (Gallery), or a repair to request (RequestQueue).",
  writeHints: [
    "Use snake_case inspection, unit, room and check refs. Provide condition for each check; use unrecorded when unknown. Photos are media refs, never URLs.",
    'Use style "rooms" to record evidence and "report" for a read-only summary. Set finalisedAt only for a signed-off record with no unrecorded checks; previousRef is a different report.',
    'To hide the previous report reference, set detail to "brief" and retain previousRef and the evidence. For brief alone, use exactly {"detail":"brief","density":null,"surface":null} for the variant fields. Null keeps the app settings; never fill unrequested defaults.',
  ],
  region: "body", weight: 3, dense: true, tier: "phone",
  realPath: "Reports and inspector sign-off live locally; adding evidence uses camera or library permission, not tenant consent.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["previous"] } },
  parts: ["root", "unit", "date", "kind", "completion", "previous", "signed", "rooms", "finalise", "message", "help"],
  items: {
    key: "entries", visibleWhen: { visible: true },
    parts: ["root", "title", "room_name", "condition", "note", "photo", "remove_photo", ...inspectionPhotoParts],
    edits: {
      condition: { action: "select", prop: "condition", choices: inspectionChoices },
      note: { action: "type", prop: "note", max: inspectionNoteLimit, empty: "unset" },
      photo: { action: "photo", prop: "photos", max: inspectionPhotoParts.length },
      remove_photo: { action: "remove", photo: "photo" },
    },
    editPath: inspectionEditPath,
  },
  signOff: { finalise: "finalisedAt" },
  partTiers: { photo: "ok" },
  confirmParts: ["remove_photo", "finalise"],
  states: ["filled", "empty", "loading", "success", "error"],
  actions: {
    parts: { finalise: ["press"] },
    items: { root: ["select"], condition: ["select"], note: ["type"], photo: ["press"], remove_photo: ["press"] },
    when: {
      root: { entryKind: "room", style: "rooms" }, finalise: { canFinalise: true },
      condition: { editable: true }, note: { editable: true },
      photo: { editable: true, canAddPhoto: true }, remove_photo: { editable: true, hasPhoto: true },
    },
  },
  select: { prop: "roomRef", value: { field: "roomRef" } },
  read: readInspection, readSuccess: true,
  live: { derive: inspectionDisplay },
} as const satisfies c.Meta;

// prettier-ignore
const check = z.strictObject({
  checkRef: ref, title: c.text(32), condition: z.enum(inspectionConditions),
  note: c.text(inspectionNoteLimit).optional(), photos: z.array(c.photo).min(0).max(inspectionPhotoParts.length),
});
// prettier-ignore
const room = z.strictObject({ roomRef: ref, title: c.text(32), checks: z.array(check).min(1).max(6) })
  .refine(({ checks }) => distinct(checks, ({ checkRef }) => checkRef), { path: ["checks"] });
// prettier-ignore
const schema = z.strictObject({
  ...c.variantProps(meta.variants), inspectionRef: recordRef, unitRef: recordRef, unit: c.text(32), date: c.isoDate,
  kind: z.enum(["move_in", "move_out", "periodic"]), rooms: z.array(room).min(1).max(8),
  previousRef: recordRef.optional(), finalisedAt: dateTime.optional(), style: z.enum(["rooms", "report"]).default("rooms"),
}).refine(({ rooms }) => distinct(rooms, ({ roomRef }) => roomRef), { path: ["rooms"] })
  .refine(({ inspectionRef, previousRef }) => inspectionRef !== previousRef, { path: ["previousRef"] })
  .refine((value) => !value.finalisedAt || inspectionProgress(value).complete, {
    path: ["finalisedAt"], message: "Every check needs a condition before sign-off",
  });
const withEntries = (value: z.output<typeof schema>) => ({
  ...value,
  entries: inspectionEntries(value),
  canFinalise: value.style === "rooms" && !value.finalisedAt && inspectionProgress(value).complete,
});
export const props = schema.overwrite(withEntries) as typeof schema &
  z.ZodType<ReturnType<typeof withEntries>, z.input<typeof schema>>;

// prettier-ignore
export function fallback(input: c.FallbackInput): z.input<typeof props> {
  const { ref, title } = seedLabels(input)[0]!;
  return { inspectionRef: `${ref}_report`, unitRef: ref, unit: title, date: seedDate, kind: "periodic",
    rooms: [{ roomRef: `${ref}_room`, title: c.placeholderTitle(1, input.lang), checks: [
      { checkRef: `${ref}_check`, title: c.placeholderTitle(2, input.lang), condition: "unrecorded", photos: [] },
    ] }] };
}

// prettier-ignore
export const examples = [
  { inspectionRef: "willow_move_in", unitRef: "flat_a", unit: "Willow Flat", date: "2026-11-18", kind: "move_in", previousRef: "willow_move_out",
    rooms: [{ roomRef: "kitchen", title: "Kitchen", checks: [
      { checkRef: "worktop", title: "Worktop", condition: "worn", note: "Light scuffs beside the sink, with no chips.", photos: ["local:1"] },
    ] }] },
  { inspectionRef: "cabin_move_out", unitRef: "north_cabin", unit: "North Cabin", date: "2026-11-17", kind: "move_out",
    previousRef: "cabin_move_in", finalisedAt: "2026-11-17T11:15:00+00:00", style: "report",
    rooms: [{ roomRef: "hall", title: "Hall", checks: [{ checkRef: "skirting", title: "Skirting", condition: "good", photos: [] }] },
      { roomRef: "bedroom", title: "Bedroom", checks: [{ checkRef: "door", title: "Door", condition: "worn", note: "The latch still closes smoothly.", photos: ["local:2"] }] }] },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Inspections");
// prettier-ignore
export const probes = [
  choose("At move-in record the condition of each feature by room, attach photos and notes, then lock the dated report"),
  choose("Give me independent household chores with a checkbox per job; no room evidence or formal report", "Checklist"),
  write("Draft a move-in report willow_move_in for Willow Flat (flat_a), dated 2026-11-18. Kitchen (kitchen), Worktop (worktop) worn, note 'Scuffs by the sink.', photo local:1. Not signed off yet."),
  { ...write("Show a brief read-only move-out condition report cabin_move_out for North Cabin (north_cabin), dated 2026-11-17. Hall (hall), skirting (skirting) is good, no photos. Keep the earlier report link cabin_move_in in the data but don’t show its reference. Keep the app’s spacing and container settings unchanged."),
    variant: { axis: "detail", value: "brief" } },
  read("Finalise and lock this completed move-in condition report", { address: "i1/finalise", action: "press" }),
] satisfies c.Probe[];

type InspectionProps = c.Props<typeof props, typeof meta> & { roomRef?: string };
type Entry = InspectionProps["entries"][number];
type Check = Extract<Entry, { entryKind: "check" }>;
type Density = c.AxisValue<"density">;
const conditionTone = {
  good: "good",
  worn: "warn",
  damaged: "bad",
  unrecorded: "muted",
  not_applicable: "text",
} as const;
// prettier-ignore
function CheckDetails({ row, edit, density, loading }: { row: Check; edit: boolean; density: Density; loading: boolean }) {
  const { lang, words: { inspections: words } } = kit.useWords(propertyWordsFor);
  const chips = inspectionConditions.map((value) => <kit.KitContent key={value} align="center">
    <kit.KitChip item={null} role="radio" disabled={false} value={value} on={value === row.condition} label={words.condition[value]} /></kit.KitContent>);
  const choices = <><kit.KitGrid columns={3} {...{ density }}>{chips.slice(0, 3)}</kit.KitGrid>
    <kit.KitGrid columns={2} {...{ density }}>{chips.slice(3)}</kit.KitGrid></>;
  const photo = (reference: string, index: number, shape: "thumb" | "square") => loading ?
    (shape === "thumb" ? <kit.KitSkeleton rows={1} inset="none" items={[{ photo: reference }]} /> :
      <kit.KitSkeleton key={index} shape="media" aspect="square" lines={[]} />) :
    <kit.KitPhoto key={index} part={inspectionPhotoParts[index]!} photo={reference} shape={shape} label={words.photoFor(row.title, c.numberLine(index + 1, lang))} />;
  const actions = <>{row.canAddPhoto && (loading ? <kit.KitSkeleton shape="control" kind="secondary" label={words.addPhoto} full /> :
    <kit.KitAction part="photo" label={words.addPhoto} kind="secondary" full />)}
    {row.hasPhoto && (loading ? <kit.KitSkeleton shape="control" kind="quiet" label={words.removePhoto} /> :
    <kit.KitAction part="remove_photo" label={words.removePhoto} kind="quiet" full />)}</>;
  const paired = edit && row.photos.length === 1;
  return <kit.KitContent {...{ density }}>{loading ?
    <kit.KitSkeleton shape="figure" inset="none" {...{ density }} content={[["body", row.title], ["body", edit ? undefined : words.condition[row.condition]], ["label", edit ? undefined : row.note]]} /> :
    <kit.KitText part="title" role="body" emphasis="strong" {...{ density }}>{row.title}</kit.KitText>}
    {edit ? <>{loading ? choices : <kit.KitTrack part="condition" role="radiogroup" label={words.conditionFor(row.title)}>{choices}</kit.KitTrack>}
      {loading ? <kit.KitRow part={null} label={words.note} tone="muted" inset="none" {...{ density }}><kit.KitSkeleton shape="control" kind="quiet" label={words.note} full /></kit.KitRow> :
        <kit.KitTextArea lines={1} part="note" value={row.note} hint={words.note} label={words.noteFor(row.title)} maxLength={inspectionNoteLimit} />}</> :
      !loading && <><kit.KitText part="condition" role="body" tone={conditionTone[row.condition]} {...{ density }}>{words.condition[row.condition]}</kit.KitText>
        {row.note && <kit.KitText part="note" role="body" tone="muted" {...{ density }}>{row.note}</kit.KitText>}</>}
    {paired ? <kit.KitRow part={null} inline label={words.addPhoto} leadingWidth="avatar" leading={photo(row.photos[0]!, 0, "thumb")} leadingAlign="row" {...{ density }}>{actions}</kit.KitRow> :
      <>{row.hasPhoto && <kit.KitGrid columns={3} {...{ density }}>{row.photos.map((ref, i) => photo(ref, i, "square"))}</kit.KitGrid>}{edit && actions}</>}
  </kit.KitContent>;
}
// prettier-ignore
function InspectionReport({ input, density, state, lang }: { input: InspectionProps; density: Density; state: c.StateName; lang: string }) {
  const { words: { inspections: words } } = kit.useWords(propertyWordsFor);
  const { date, kind, completion, signed, previous } = inspectionSummary(input, lang);
  const rooms = input.entries.filter((row) => row.entryKind === "room");
  const current = input.roomRef ?? rooms[0]?.roomRef;
  const visible = input.entries.filter((row) => row.visible);
  const loading = state === "loading", edit = state !== "success", selector = input.style === "rooms" && edit;
  return <>{(!loading && (state === "success" || signed)) && <kit.KitText part="message" role="label" tone="good">{words.finalised}</kit.KitText>}
    {loading ? <kit.KitSkeleton shape="figure" inset="none" {...{ density }} content={[["title", input.unit], ["label", kind], ["label", date], ["number", completion, "start", "compact"], ["label", signed], ["label", previous]]} /> : <kit.KitContent {...{ density }}>
      <kit.KitText part="unit" role="title" {...{ density }}>{input.unit}</kit.KitText>
      <kit.KitText part="kind" role="label" tone="muted" {...{ density }}>{kind}</kit.KitText>
      <kit.KitText part="date" role="label" tone="muted" {...{ density }}>{date}</kit.KitText>
      <kit.KitText part="completion" role="number" numberScale="compact" tabular {...{ density }}>{completion}</kit.KitText>
      {signed && <kit.KitText part="signed" role="label" tone="good" {...{ density }}>{signed}</kit.KitText>}
      {previous && <kit.KitText part="previous" role="label" tone="muted" {...{ density }}>{previous}</kit.KitText>}
    </kit.KitContent>}
    {selector && <kit.KitTrack part="rooms" role="radiogroup" label={words.rooms}>{rooms.map((row) =>
      <kit.KitChip key={row.id} item={row.id} role="radio" disabled={false} labelPart="room_name" label={row.title} on={row.roomRef === current} />)}</kit.KitTrack>}
    {rooms.filter((room) => input.style === "report" || room.roomRef === current).map((room) =>
      <kit.KitContent key={room.id} group={selector ? "content" : "response"} {...{ density }}>
        {!selector && (loading ? <kit.KitSkeleton shape="figure" inset="none" content={[["label", room.title]]} /> :
          <kit.KitText item={room.id} part="root" role="label" tone="muted" {...{ density }}><kit.KitText item={room.id} part="title" role="label" tone="muted" {...{ density }}>{room.title}</kit.KitText></kit.KitText>)}
        {visible.filter((row): row is Check => row.entryKind === "check" && row.roomRef === room.roomRef).map((row) =>
          <kit.KitRow key={row.id} item={row.id} part={loading ? null : "root"} label={row.title} inline {...{ density }}>
            <CheckDetails {...{ row, density, loading }} edit={edit && row.editable} /></kit.KitRow>)}
      </kit.KitContent>)}
    {edit && input.canFinalise && (loading ? <kit.KitSkeleton shape="control" kind="primary" label={words.finalise} full /> :
      <kit.KitAction part="finalise" label={words.finalise} full />)}
  </>;
}
// prettier-ignore
export function Inspections(input: InspectionProps) {
  const state = kit.useComponentState();
  const { lang, words: { inspections: words } } = kit.useWords(propertyWordsFor);
  const visible = kit.useLiveControls(meta, input) as InspectionProps;
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  return <kit.KitCard part="root" padded {...{ density, surface }}>
    {state === "empty" ? <kit.KitEmpty part="message" decorativeIcon /> :
      state === "error" ? <kit.KitContent><kit.KitText part="message" role="heading" tone="bad">{words.error}</kit.KitText>
        <kit.KitText part="help" role="label" tone="muted">{words.errorDetail}</kit.KitText></kit.KitContent> :
      <InspectionReport {...{ input: { ...visible, detail }, density, state, lang }} />}
  </kit.KitCard>;
}
