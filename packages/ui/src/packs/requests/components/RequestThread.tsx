import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { threadEntryCopy, threadLoading, threadOrder, threadRead } from "../copy";
import { requestsWordsFor } from "../lang";
import { requestStatus } from "./RequestQueue";
import { prompt } from "../../../entry/prompt-RequestThread.generated";

const audiences = ["requester", "internal"] as const;
const draftLimit = 240;
type ThreadAccess = { role: "staff" | "requester"; canReply: boolean };
// prettier-ignore
function threadGates(input: Readonly<c.Values>, access?: ThreadAccess): c.Values {
  const choices: readonly string[] = !access?.canReply ? [] : access.role === "staff" ? audiences : ["requester"];
  const draft = choices.length ? input.draft : undefined;
  const entries = input.entries as c.Values[];
  return {
    draft,
    entries: access?.role === "staff" ? entries : entries.filter(({ audience }) => audience === "requester"),
    audience_choices: choices,
    replyable: choices.length > 0,
    sendable: choices.includes(String(input.audience)) && typeof draft === "string" && Boolean(draft.trim()),
  };
}
// The catalog and visual fixtures are staff previews.
const previewAccess: ThreadAccess = { role: "staff", canReply: true };
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
  partTiers: { send: "people" },
  realPath: "Messages and operational events are linked to one request in a shared app.",
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["event_detail"] } },
  parts: ["root", "number", "field", "audience", "send", "send_label", "notice"],
  items: {
    key: "entries",
    parts: ["root", "by", "date", "time", "audience", "text", "photo", "event_detail"],
  },
  states: ["filled", "empty", "loading", "success", "error"],
  actions: {
    parts: { field: ["type"], audience: ["select"], send: ["send"] },
    items: { root: ["press"] },
    when: { root: { kind: "work" }, field: { replyable: true }, send: { sendable: true } },
  },
  emptyActions: ["field.type", "audience.select", "send.send"],
  selections: { audience: { prop: "audience", choices: { prop: "audience_choices" } } },
  // prettier-ignore
  live: {
    text: { field: { prop: "draft", max: draftLimit } }, send: { send: { field: "field", audience: "audience" } },
    derive: (input) => threadGates(input, previewAccess),
  },
  successActions: ["root.press"],
  readSuccess: true,
  read: threadRead,
} as const satisfies c.Meta;
// prettier-ignore
const entry = z.strictObject({
  by: c.text(24), date: c.isoDate, time: c.clock, audience: z.enum(audiences),
  kind: z.enum(["message", "status", "assignment", "work"]),
  text: c.text(draftLimit).optional(), photo: c.photo.optional(), goto: c.screenId.optional(),
  from: requestStatus.optional(), to: requestStatus.optional(),
  who: c.text(24).meta({ kind: undefined }).optional(), order: c.text(12).meta({ kind: undefined }).optional(),
})
  .refine(
    ({ kind, text, photo, from, to, who, order, goto }) =>
      (kind === "message") === Boolean(text) && (kind === "message" || !photo) &&
      (kind === "status") === Boolean(from) && (kind === "status") === Boolean(to) &&
      (kind === "assignment") === Boolean(who) &&
      (kind === "work") === Boolean(order) && (kind === "work") === Boolean(goto),
    "Only fields for the entry kind are allowed",
  );

// prettier-ignore
export const props = z.strictObject({
  ...c.variantProps(meta.variants), number: c.text(12).meta({ kind: undefined }), entries: z.array(entry).min(0).max(6),
  draft: c.text(draftLimit).meta({ kind: undefined }).optional(), audience: z.enum(audiences).default("requester"),
}).overwrite((value) => ({ ...value, ...threadGates(value, previewAccess) }));

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
  return { props, examples, fallback, probes, meta: { ...meta, live: { ...meta.live, derive: (p, id) => threadGates(p, accessFor(id)) } } };
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
  { ...trot, entries: [...trot.entries] },
  { ...trot, entries: [...trot.entries], detail: "brief" },
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
  read("Tap the work order WO-14 row in the repair updates. Use its full address and the action name without the destination.", { address: "r1/r2", action: "press" }),
  read("Send the drafted reply about the replacement grow light", { address: "r1/send", action: "send" }),
] satisfies c.Probe[];

type ThreadProps = c.Props<typeof props, typeof meta>;
type Finish = Pick<ThreadProps, "detail"> & { density: c.ThemeDensity };
type ThreadLive = ThreadProps & { audience_choices: readonly ThreadProps["audience"][]; sendable: boolean };
// prettier-ignore
function ThreadEntry({ row, detail, density, lang }: Finish & { row: ThreadProps["entries"][number]; lang: string }) {
  const { event, fact, date, time, audience } = threadEntryCopy(row, detail, lang);
  const photoLabel = requestsWordsFor(lang).thread.photo;
  return <kit.KitRow item={row.id} label={fact ?? event ?? row.by} goto={row.goto}
    density={row.kind === "message" ? "comfortable" : density}
    tone={row.kind === "message" ? "muted" : undefined}
    trailing={row.goto && <kit.KitIcon name="chevron_right" tone="muted" scale="sm" decorative />}>
    <kit.KitContent lineRole="body" density={density}>
      {event && <kit.KitText part={null} role="label">{event}</kit.KitText>}
      {fact && <kit.KitText part="event_detail" role="body">{fact}</kit.KitText>}
      <kit.KitText part="by" role={event ? "caption" : "label"} tone={event ? "muted" : "text"}>{row.by}</kit.KitText>
      {row.text && <kit.KitText part="text" role="body">{row.text}</kit.KitText>}
      <kit.KitText part={null} role="caption" tone="muted">
        <kit.KitText part="time" role="caption" tone="muted" tabular>{time}</kit.KitText>{" "}
        <kit.KitText part="date" role="caption" tone="muted">{date}</kit.KitText>
      </kit.KitText>
      <kit.KitText part="audience" role="caption" tone="muted">{audience}</kit.KitText>
      {row.photo && <><kit.KitPhoto part="photo" photo={row.photo} label={photoLabel} />
        <kit.KitText part={null} role="caption" tone="muted">{photoLabel}</kit.KitText></>}
    </kit.KitContent>
  </kit.KitRow>;
}

// prettier-ignore
export function RequestThread(input: ThreadProps) {
  const { words: { thread: words }, lang } = kit.useWords(requestsWordsFor);
  const state = kit.useComponentState();
  const density = kit.useKit().density;
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const { entries, draft, audience, audience_choices: choices, sendable } = kit.useLiveControls(meta, input) as ThreadLive;
  const loading = state === "loading" ? threadLoading({ number: input.number, detail, entries }, lang) : undefined;
  return <kit.KitCard part="root" padded density={density}>
    {loading ? <>
      <kit.KitSkeleton lead="none" rows={loading.length} items={loading} density={density} />
      {choices.length > 0 && <kit.KitContent inset="md" group="response">
        <kit.KitSkeleton shape="figure" inset="none" content={[["label", words.audience]]} />
        <kit.KitSkeleton shape="control" full label={words.audience} />
        <kit.KitRow label={words.field} tone="muted" density="comfortable">
          <kit.KitSkeleton shape="figure" inset="none" content={[["body", draft || words.field], ["body", words.field]]} />
        </kit.KitRow>
        <kit.KitSkeleton shape="control" full label={words.send} />
      </kit.KitContent>}
    </> : <>
      <kit.KitContent inset="md" density={density}><kit.KitText part="number" role="heading">{words.heading(input.number)}</kit.KitText></kit.KitContent>
      {state === "error" || state === "success" ? <kit.KitContent inset="md" group="response">
        <kit.KitText part="notice" tone={state === "error" ? "bad" : "good"}>{state === "error" ? words.failed : words.sent}</kit.KitText>
        {state === "error" && draft && <kit.KitText part="field">{draft}</kit.KitText>}
      </kit.KitContent> : null}
      {state !== "error" && (state === "empty" || (state === "filled" && !entries.length)
        ? <kit.KitEmpty part="notice" icon="message" decorativeIcon />
        : threadOrder(entries).map((row) => <ThreadEntry key={row.id} {...{ row, detail, density, lang }} />))}
      {(state === "filled" || state === "empty") && choices.length > 0 && <kit.KitContent inset="md" group="response" density={density}>
        <kit.KitText part={null} role="label">{words.audience}</kit.KitText>
        <kit.KitTrack part="audience" look="segments" role="radiogroup" label={words.audience}>
          {choices.map((choice) => <kit.KitChip key={choice} item={null} look="segment" role="radio" value={choice} label={words.audiences[choice]} on={audience === choice} />)}
        </kit.KitTrack>
        <kit.KitTextArea part="field" label={words.field} hint={words.field} value={draft} lines={2} maxLength={draftLimit} />
        <kit.KitAction part="send" full action="send" label={words.send} disabled={!sendable} />
      </kit.KitContent>}
    </>}
  </kit.KitCard>;
}
