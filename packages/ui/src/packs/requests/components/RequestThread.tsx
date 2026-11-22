import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { threadAudiences, threadGates, threadOrder, threadRead, type ThreadAccess } from "../copy";
import { requestsWordsFor } from "../lang";
import { requestStatus } from "./RequestQueue";
import { prompt } from "../../../entry/prompt-RequestThread.generated";
import * as threadView from "./thread-entry";

const draftLimit = 240;
// The catalog and visual fixtures are staff previews.
const previewAccess: ThreadAccess = { role: "staff", canReply: true };
const sampleFile = { fileRef: "demo_gate_report", name: "Gate inspection.pdf" };
// Core first: Bubbles/default cannot interleave typed work events or distinguish staff-only notes.
export const meta = {
  id: "RequestThread",
  status: "ready",
  group: "content",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  tier: "people",
  partTiers: { field: "phone", send: "people", canned: "phone" },
  realPath: "Messages and operational events are linked to one request in a shared app.",
  variants: { density: ["comfortable", "compact"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["event_detail"] } },
  parts: ["root", "number", "field", "audience", "send", "send_label", "notice", "canned"],
  items: {
    key: "entries",
    parts: ["root", "by", "date", "time", "audience", "text", "photo", "event_detail", "file"],
  },
  states: ["filled", "empty", "loading", "success", "error"],
  actions: {
    parts: { field: ["type"], audience: ["select"], send: ["send"], canned: ["press"] },
    items: { root: ["press"] },
    when: {
      root: { kind: "work" },
      field: { replyable: true },
      send: { sendable: true },
      canned: { canBrowseReplies: true },
    },
  },
  emptyActions: ["field.type", "audience.select", "send.send", "canned.press"],
  selections: { audience: { prop: "audience", choices: { prop: "audience_choices" } } },
  deviceData: ["requestFiles"],
  previewDeviceData: () => ({ requestFiles: [sampleFile] }),
  // prettier-ignore
  live: {
    text: { field: { prop: "draft", max: draftLimit } }, send: { send: { field: "field", audience: "audience" } },
    derive: (input, _id, data) => threadGates(input, previewAccess, data),
  },
  successActions: ["root.press"],
  readSuccess: true,
  read: threadRead,
} as const satisfies c.Meta;
const file = c
  .text(32)
  .refine((ref) => !/[/\\]|^[a-z][a-z\d+.-]*:(?!\d+$)/i.test(ref))
  .meta({ kind: "secret", max: 32 });
// prettier-ignore
const entry = z.strictObject({
  by: c.text(24), date: c.isoDate, time: c.clock, audience: z.enum(threadAudiences),
  kind: z.enum(["message", "status", "assignment", "work"]),
  text: c.text(draftLimit).optional(), photo: c.photo.optional(), file: file.optional(), goto: c.screenId.optional(),
  from: requestStatus.optional(), to: requestStatus.optional(),
  who: c.text(24).meta({ kind: undefined }).optional(), order: c.text(12).meta({ kind: undefined }).optional(),
})
  .refine(
    ({ kind, text, photo, file, from, to, who, order, goto }) =>
      (kind === "message") === Boolean(text) && (kind === "message" || (!photo && !file)) &&
      (kind === "status") === Boolean(from) && (kind === "status") === Boolean(to) &&
      (kind === "assignment") === Boolean(who) &&
      (kind === "work") === Boolean(order) && (kind === "work") === Boolean(goto),
    "Only fields for the entry kind are allowed",
  );

// prettier-ignore
export const props = z.strictObject({
  ...c.variantProps(meta.variants), number: c.text(12).meta({ kind: undefined }), entries: z.array(entry).min(0).max(6),
  draft: c.text(draftLimit).meta({ kind: undefined }).optional(), audience: z.enum(threadAudiences).default("requester"),
  cannedGoto: c.screenId.optional(),
}).overwrite((value) => ({
  ...value, ...threadGates(value, previewAccess), canned: value.cannedGoto ? { goto: value.cannedGoto } : undefined,
}));

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const item = c.itemsOf(cast, 1)[0];
  const thing = c.thingOf(cast);
  const number = (item && c.titleOf(item, 12, thing)) || c.wordsFor(lang).placeholderValue;
  const draft = item && c.detailOf(item, draftLimit, thing);
  return { number, entries: [], draft: draft || undefined };
}

/** Bind host permissions before rendering, reading or acting on an actual request. */
// prettier-ignore
export function bindRequestThread(accessFor: (instance: string) => ThreadAccess | undefined): c.Definition {
  return { props, examples, fallback, probes, meta: { ...meta, live: { ...meta.live, derive: (p, id, data) => threadGates(p, accessFor(id), data) } } };
}

// prettier-ignore
const trot = { number: "TR-06", audience: "internal", entries: [
  { by: "Kai", date: "2026-11-20", time: "09:00", audience: "requester", kind: "message", text: "The kennel gate now closes properly." },
  { by: "Kai", date: "2026-11-20", time: "09:15", audience: "requester", kind: "status", from: "working", to: "resolved" },
] } as const;
// prettier-ignore
export const examples = [
  { number: "LG-41", draft: "The replacement grow light is due tomorrow.", entries: [
    { by: "Noor", date: "2026-11-19", time: "09:00", audience: "internal", kind: "assignment", who: "Ella" },
    { by: "Ella", date: "2026-11-19", time: "09:30", audience: "internal", kind: "work", order: "WO-14", goto: "work" },
    { by: "Ella", date: "2026-11-19", time: "10:00", audience: "requester", kind: "status", from: "working", to: "waiting" },
    { by: "Ella", date: "2026-11-19", time: "10:15", audience: "internal", kind: "message", text: "The grow light cable is loose.", photo: "local:1" },
  ] },
  { ...trot, entries: [...trot.entries] },
  { ...trot, entries: [...trot.entries], density: "compact" },
  { ...trot, entries: [...trot.entries], detail: "brief" },
  { ...trot, cannedGoto: "saved_replies", entries: [{ ...trot.entries[0], file: sampleFile.fileRef }, trot.entries[1]] },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("RequestThread");
// prettier-ignore
export const probes = [
  choose("For this repair ticket, mix messages with assignment, status and linked work-order events, and let staff choose who can see each reply"),
  choose("Show a plain two-person chat with alternating message bubbles and no event log or private staff notes", "Bubbles"),
  {
    ...write("On ticket TR-06 log Kai moving working to resolved on 2026-11-20 at 09:15 for the requester. Use the shorter event treatment without shortening messages."),
    variant: { axis: "detail", value: "brief" },
  },
  { ...write("For request TR-06, give staff a shortcut from the empty reply thread to the saved reply templates on screen saved_replies. No entries yet."), expectProps: { cannedGoto: "saved_replies" } },
  { ...write("On request TR-06, Kai told the requester at 09:00 on 2026-11-20: The kennel gate now closes properly. Attach the file with opaque reference demo_gate_report to that one message."), expectProps: { entries: [{ file: "demo_gate_report" }] } },
  read("Tap the work order WO-14 row in the repair updates. Use its full address and the action name without the destination.", { address: "r1/r2", action: "press" }),
  read("Send the drafted reply about the replacement grow light", { address: "r1/send", action: "send" }),
] satisfies c.Probe[];

export type ThreadProps = c.Props<typeof props, typeof meta>;
type ThreadLive = ThreadProps & {
  audience_choices: readonly ThreadProps["audience"][];
  sendable: boolean;
  canBrowseReplies: boolean;
};
// prettier-ignore
export function RequestThread(input: ThreadProps) {
  const { words: { thread: words }, lang } = kit.useWords(requestsWordsFor);
  const state = kit.useComponentState();
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const { entries, draft, audience, audience_choices: choices, sendable, canBrowseReplies } = kit.useLiveControls(meta, input) as ThreadLive;
  const rows = threadOrder(entries).map((row) => <threadView.ThreadEntry key={row.id} {...{ row, detail, density, lang }} />);
  const send = <kit.KitAction part="send" full action="send" label={words.send} disabled={!sendable} />;
  return <kit.KitCard part="root" padded density={density}>
    {state === "loading" ? <kit.KitState density={density} loading={<>
      <kit.KitContent inset="md" density={density}><kit.KitLayoutText line={{ text: words.heading(input.number), role: "body", strong: true }} density={density} /></kit.KitContent>
      {rows}
      {choices.length > 0 && <kit.KitContent inset="md" group="response">
        <kit.KitSkeleton shape="figure" inset="none" content={[["label", words.audience]]} />
        <kit.KitSkeleton shape="control" full label={words.audience} />
        <kit.KitRow label={words.field} tone="muted" density="comfortable">
          <kit.KitSkeleton shape="figure" inset="none" content={[["body", draft || words.field], ["body", words.field]]} />
        </kit.KitRow>
        {canBrowseReplies && <kit.KitSkeleton shape="control" kind="secondary" label={words.canned} />}
        <kit.KitSkeleton shape="control" full label={words.send} />
      </kit.KitContent>}
    </>} /> : <>
      <kit.KitContent inset="md" density={density}><kit.KitText part="number" role="heading">{words.heading(input.number)}</kit.KitText></kit.KitContent>
      {state === "error" || state === "success" ? <kit.KitContent inset="md" group="response">
        <kit.KitText part="notice" tone={state === "error" ? "bad" : "good"}>{state === "error" ? words.failed : words.sent}</kit.KitText>
        {state === "error" && draft && <kit.KitText part="field">{draft}</kit.KitText>}
      </kit.KitContent> : null}
      {state !== "error" && (state === "empty" || (state === "filled" && !entries.length)
        ? <kit.KitEmpty part="notice" icon="message" decorativeIcon />
        : rows)}
      {(state === "filled" || state === "empty") && choices.length > 0 && <kit.KitContent inset="md" group="response" density={density}>
        <kit.KitText part={null} role="label">{words.audience}</kit.KitText>
        <kit.KitTrack part="audience" look="segments" role="radiogroup" label={words.audience}>
          {choices.map((choice) => <kit.KitChip key={choice} item={null} look="segment" role="radio" value={choice} label={words.audiences[choice]} on={audience === choice} />)}
        </kit.KitTrack>
        <kit.KitTextArea part="field" label={words.field} hint={words.field} value={draft} lines={2} maxLength={draftLimit} />
        {canBrowseReplies ? <>
          <kit.KitAction part="canned" goto={input.cannedGoto} label={words.canned} kind="secondary" />
          <kit.KitContent group="response" density={density}>{send}</kit.KitContent>
        </> : send}
      </kit.KitContent>}
    </>}
  </kit.KitCard>;
}
