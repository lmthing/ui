import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { workOrderCopy, workOrderLine, workOrderReading, type WorkLine } from "../copy";
import { requestsWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-WorkOrder.generated";
import * as notesView from "./work-order-notes";
// prettier-ignore
const blocker = z.enum(["information", "access", "parts", "other"]), maxNote = 120;
// Core first: Checklist/default cannot link a job to a request, time it or account for consumed parts.
// prettier-ignore
export const meta = {
  id: "WorkOrder", status: "ready", group: "input",
  purpose: prompt.purpose, pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body", weight: 3, dense: true, tier: "phone",
  realPath: "Work records and clock events live on the technician's device without changing stock or payments.",
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["who", "window"] } },
  parts: ["root", "number", "request", "asset", "title", "who", "window", "status", "clock", "clock_value", "clock_label", "blocked", "note", "sign_off", "finish", "finish_label", "total"],
  items: { key: "lines", parts: ["root", "text", "required", "check", "name", "qty", "cost"],
    set: { qty: { prop: "qty", min: Number.MIN_VALUE } } },
  selections: { blocked: { prop: "blockedBy", choices: blocker.options, runtime: true, clear: "none" } },
  live: { text: { note: { prop: "note", max: maxNote } }, checks: { check: "done" },
    toggles: { sign_off: { prop: "signOff", initial: false } }, derive: workGates },
  states: ["filled", "loading", "success", "error"], readSuccess: true, read: workOrderReading,
  clocks: [{ id: "work", kind: "up", prop: "elapsed", runningProp: "running", when: { editable: true },
    start: { part: "clock", action: "start" }, stop: { part: "clock", action: "stop" } }],
  actions: {
    parts: { clock: ["start", "stop"], blocked: ["select"], note: ["type"], sign_off: ["check"], finish: ["press"] }, items: { check: ["check"], qty: ["set"] },
    when: {
      check: { editable: true, kind: "task" }, qty: { editable: true, kind: "part" },
      "clock.start": { canStart: true, running: false }, "clock.stop": { editable: true, running: true },
      blocked: { editable: true }, note: { editable: true }, finish: { finishable: true, running: false },
      sign_off: { editable: true, requiresSignOff: true },
    },
  },
} as const satisfies c.Meta;
// prettier-ignore
const task = z.strictObject({ text: c.text(36), required: z.boolean(), done: z.boolean() }), part = z.strictObject({ name: c.text(32), qty: z.number().positive(), unitCost: z.number().min(0).optional() });
// prettier-ignore
export const props = z.strictObject({
    ...c.variantProps(meta.variants), number: c.text(12), request: c.text(12), title: c.text(32),
    assetRef: c.text(32).meta({ kind: undefined }).optional(), signOff: z.boolean().optional(),
    who: c.text(24).meta({ kind: undefined }).optional(), date: c.isoDate.optional(), from: c.clock.optional(), to: c.clock.optional(),
    status: z.enum(["ready", "working", "blocked", "done"]), blockedBy: blocker.optional(), note: c.text(maxNote).optional(),
    tasks: z.array(task).min(1).max(6), parts: z.array(part).min(0).max(8),
    minutes: z.number().min(0), style: z.enum(["worksheet", "summary"]).default("worksheet"),
  })
  .refine(({ date, from, to }) => (!date && !from && !to) || Boolean(date && from && to && from < to), {
    path: ["to"], message: "Give a date and a later end time, or omit the window" })
  .refine(({ status, blockedBy, note }) => status !== "blocked" || Boolean(blockedBy && note), { path: ["blockedBy"] })
  .refine(({ style, status }) => style !== "summary" || status === "done", { path: ["style"] })
  .overwrite((value) => ({
    ...value, running: false, note: value.note ?? "", requiresSignOff: value.signOff !== undefined,
    editable: value.style === "worksheet" && value.status !== "done",
    canStart: value.style === "worksheet" && value.status !== "done" && !value.blockedBy,
    lines: [...value.tasks.map((task) => ({ ...task, kind: "task" })),
      ...value.parts.map((part) => ({ ...part, kind: "part" }))],
  }));
// prettier-ignore
export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast), items = c.itemsOf(cast, 3);
  return {
    number: c.placeholderValue, request: c.placeholderValue, status: "ready", minutes: 0, parts: [],
    title: (items[0] && c.titleOf(items[0], 32, thing)) || c.placeholderTitle(0, lang),
    tasks: (items.length ? items : [undefined]).map((item, index) => ({
      text: (item && c.titleOf(item, 36, thing)) || c.placeholderTitle(index, lang), required: true, done: false,
    })),
  };
}
// prettier-ignore
export const examples = [
  { number: "WO-14", request: "LG-41", title: "Replace the grow light", who: "Ella", date: "2026-11-20", from: "13:00", to: "14:00",
    status: "blocked", blockedBy: "parts", note: "Waiting for a replacement light.", minutes: 20,
    tasks: [{ text: "Inspect the cable", required: true, done: true }, { text: "Test the grow light timer", required: true, done: false }],
    parts: [{ name: "LED grow light", qty: 1, unitCost: 19 }] },
  { number: "WO-22", request: "TR-06", title: "Adjust the kennel gate", status: "done", style: "summary",
    minutes: 35, tasks: [{ text: "Check the gate latches", required: true, done: true }], parts: [{ name: "Mounting screws", qty: 4 }] },
  { number: "WO-23", request: "TR-07", title: "Replace the lead hooks", who: "Kai", date: "2026-11-21", from: "10:00", to: "11:00",
    status: "ready", minutes: 10, assetRef: "HOOK-RACK-3", signOff: false,
    tasks: [{ text: "Check the hooks are secure", required: true, done: true }],
    parts: [{ name: "Wall hooks", qty: 2, unitCost: 3.5 }] },
] satisfies z.input<typeof props>[];
const { choose, write, read } = c.probesFor("WorkOrder");
// prettier-ignore
export const probes = [
  choose("Give the technician an assigned job tied to the reported fault, with required tests, a work clock and a log of materials used"),
  choose("Give me three independent chores, each with a checkbox, without a work record", "Checklist"),
  write("Job WO-14 for repair LG-41 is Replace the grow light, assigned to Ella, working with 20 minutes logged. Inspect the cable is required and done; Test the grow light timer is required and not done. One LED grow light at unit cost 19."),
  { ...write("For WO-23, Replace the lead hooks on request TR-07, show the ready worksheet with 10 minutes logged and the required check 'Check the hooks are secure' done. Use two wall hooks at 3.50 each. Keep the checklist, but omit the assignee and planned window from sight."),
    variant: { axis: "detail", value: "brief" } },
  { ...write("WO-23 for TR-07 is Replace the lead hooks, ready with 10 minutes logged. It is for asset HOOK-RACK-3. Required check 'Check the hooks are secure' is done. No parts."), expectProps: { assetRef: "HOOK-RACK-3" } },
  { ...write("WO-23 for TR-07 is Replace the lead hooks, ready with 10 minutes logged. Required check 'Check the hooks are secure' is done and no parts were used. The technician must explicitly sign off before finishing but has not done so yet."), expectProps: { signOff: false } },
  read("Tick off Test the grow light timer on this job", { address: "w1/r2/check", action: "check" }),
] satisfies c.Probe[];
// prettier-ignore
type View = c.Props<typeof props, typeof meta> & {
  lines: WorkLine[]; running: boolean; elapsed?: number; note: string; editable: boolean; canStart: boolean; finishable: boolean; requiresSignOff: boolean;
};
type Words = ReturnType<typeof requestsWordsFor>["workOrder"];
type Copy = ReturnType<typeof workOrderCopy>;
/** Bind a real host's permission check for the linked work record; missing authority denies edits. */
export function workOrderGates(canWork: (instance: string) => boolean | undefined) {
  return (input: c.Values, instance: string) => deriveWork(input, canWork(instance) === true);
}
function deriveWork(input: c.Values, authorized: boolean) {
  const p = input as View;
  const editable = authorized && p.style === "worksheet" && p.status !== "done";
  const canStart = editable && !p.blockedBy;
  const finishable =
    canStart &&
    (!p.requiresSignOff || p.signOff === true) &&
    p.lines.every((line) => line.kind !== "task" || !line.required || line.done);
  return { editable, canStart, finishable };
}
// The catalog itself is a local preview; a real host supplies a bound definition.
// prettier-ignore
function workGates(input: c.Values): c.Values { return deriveWork(input, true); }
// prettier-ignore
function WorkHeader({ p, copy, loading, error }: { p: View; copy: Copy; loading: boolean; error: boolean }) {
  const fields = [["number", "label", copy.number, "muted"], ["title", "title", p.title, "text"],
    ["status", "label", copy.status, copy.statusTone], ["request", "body", copy.request, "muted"], ["asset", "body", copy.asset, "muted"],
    ["who", "body", copy.who, "muted"], ["window", "body", copy.window, "muted"]] as const;
  return loading ? <kit.KitSkeleton shape="figure" inset="none"
    content={fields.flatMap(([, role, text]) => text ? [[role, text] as const] : [])} />
    : <kit.KitContent group={error ? "response" : "content"}>{fields.map(([part, role, text, tone]) => text &&
      <kit.KitText key={part} {...{ part, role, tone }}>{text}</kit.KitText>)}</kit.KitContent>;
}
// prettier-ignore
function WorkItems({ p, w, lang, group, loading }: { p: View; w: Words; lang: string; group: "content" | "response"; loading: boolean }) {
  return (["task", "part"] as const).map((kind) => {
      const rows = p.lines.filter((line) => line.kind === kind);
      return rows.length ? <kit.KitContent key={kind} group={group}>
        {loading ? <kit.KitSkeleton shape="figure" inset="none" content={[["label", kind === "task" ? w.checks : w.parts]]} />
          : <kit.KitText role="label" tone="muted" part={null}>{kind === "task" ? w.checks : w.parts}</kit.KitText>}
        {rows.map((row) => {
          if (row.kind === "task") return <kit.KitRow key={row.id} {...(loading ? {} : { item: row.id })} label={row.text} inline leadingWidth="avatar" leadingAlign="row"
            leading={loading ? <kit.KitSkeleton shape="control" kind="quiet" />
              : p.editable ? <kit.KitCheck part="check" done={row.done} label={row.text} />
              : <kit.KitIcon part="check" name={row.done ? "circle_check" : "minus"} tone={row.done ? "good" : "muted"} />}>
            <kit.KitLayoutText line={{ text: row.text, part: "text" }} />
            {row.required && <kit.KitLayoutText line={{ text: w.required, part: "required", role: "meta", tone: "muted" }} />}</kit.KitRow>;
          const { qty, cost } = workOrderLine(row, lang);
          if (!p.editable && !loading) return <kit.KitRow key={row.id} item={row.id} label={row.name} inline fitContent
            trailing={<kit.KitText part="qty" role="number" numberScale="compact" tabular>{qty}</kit.KitText>}>
            <kit.KitText part="name">{row.name}</kit.KitText>
            {cost && <kit.KitText part="cost" role="number" numberScale="compact" tone="muted" tabular>{cost}</kit.KitText>}
          </kit.KitRow>;
          return <kit.KitRow key={row.id} {...(loading ? {} : { item: row.id })} label={row.name} inline><kit.KitGrid fitLast>
            {loading ? <kit.KitSkeleton shape="figure" inset="none" content={[["body", row.name], ["body", cost]]} />
            : <kit.KitContent><kit.KitText part="name">{row.name}</kit.KitText>
              {cost && <kit.KitText part="cost" role="number" numberScale="compact" tone="muted" tabular>{cost}</kit.KitText>}</kit.KitContent>}
            {p.editable ? <kit.KitRow inline label={w.quantityOf(row.name)} leading={!loading &&
              <kit.KitText role="label" part={null} tone="muted">{w.quantity}</kit.KitText>} leadingAlign="row">
              <kit.KitInput compact projected action="set" kind="number" min={Number.MIN_VALUE} part="qty"
                label={w.quantityOf(row.name)} hint={w.quantity} value={String(row.qty)} /></kit.KitRow>
              : undefined}
          </kit.KitGrid></kit.KitRow>;
        })}</kit.KitContent> : null;
    });
}
// prettier-ignore
export function WorkOrder(input: c.Props<typeof props, typeof meta>) {
  const { words: { workOrder: w }, lang } = kit.useWords(requestsWordsFor), state = kit.useComponentState();
  const density = kit.useKit().density, surface = "card";
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail), live = kit.useLiveControls(meta, input) as View;
  const p = { ...live, detail, editable: (state === "filled" || state === "loading") && live.editable };
  const copy = workOrderCopy(p, state, lang), success = state === "success", loading = state === "loading", error = state === "error";
  const group = density === "compact" ? "content" : "response", canFinish = p.finishable && !p.running;
  return <kit.KitCard part="root" padded {...{ density, surface }}>
    {error && <kit.KitContent><kit.KitText part={null} role="label" tone="bad">{w.error}</kit.KitText>
      <kit.KitText part={null} tone="muted">{w.errorDetail}</kit.KitText></kit.KitContent>}
    <WorkHeader {...{ p, copy, loading, error }} />
    {!success && <><kit.KitContent group={group}><kit.KitGrid fitLast>
          {loading ? <kit.KitSkeleton shape="figure" inset="none" content={[["label", w.clock], ["body", copy.clock]]} />
            : <kit.KitContent><kit.KitText role="label" part={null} tone="muted">{w.clock}</kit.KitText>
              <kit.KitText role="number" numberScale="compact" tabular part="clock_value">{copy.clock}</kit.KitText></kit.KitContent>}
          {p.editable && <kit.KitAction part="clock" kind="secondary" action={p.running ? "stop" : "start"}
            disabled={!p.running && !p.canStart} label={p.running ? w.stop : w.start} />}
        </kit.KitGrid></kit.KitContent>
    <WorkItems {...{ p, w, lang, group, loading }} />
    {copy.total && <kit.KitGrid fitLast>
      <kit.KitLayoutText line={{ text: copy.total.label, role: "meta", tone: "muted" }} />
      <kit.KitLayoutText line={{ text: copy.total.value, role: "figure", compact: true, part: "total", tabular: true }} align="end" />
    </kit.KitGrid>}
    <notesView.WorkNotes {...{ p, copy, w, loading, maxNote }} />
    {p.editable && <kit.KitContent group="response">
      {p.requiresSignOff && <kit.KitRow part={null} inset="none" inline label={w.signOff}
        leading={<kit.KitCheck part="sign_off" done={p.signOff === true} label={w.signOff} disabled={loading} />}>
        <kit.KitLayoutText line={{ text: w.signOff, role: "body" }} />
      </kit.KitRow>}
      <kit.KitAction part="finish" full kind={canFinish ? "primary" : "secondary"} disabled={!canFinish} label={w.finish} />
    </kit.KitContent>}</>}
  </kit.KitCard>;
}
