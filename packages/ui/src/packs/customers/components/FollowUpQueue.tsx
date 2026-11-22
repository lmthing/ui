import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { followUpDetails, followUpPriority, followUpToday, orderFollowUps } from "../copy";
import { customersWordsFor } from "../lang";

// Core first: Checklist/default cannot order client outreach by due date or offer snooze and service reminders.
export const meta = {
  id: "FollowUpQueue",
  status: "ready",
  group: "data",
  purpose: "Prioritize client outreach by due date and act on each follow-up.",
  pick: "A prioritized queue of client follow-ups across quotes, invoices, renewals and check-ins. Not plain jobs to tick off (Checklist), a client header (ClientCard), or repair tickets (RequestQueue).",
  writeHints: [
    "Each entry needs a short unique id, clientName, kind, due date and done flag. Use done:false unless it is completed. Do not write urgency, groups per row or sort positions.",
    'Use group "none" for an unsectioned queue when asked. Leave group null for the default due-date sections.',
    'If the only appearance request is one list without sections, the exact axis values are {"group":"none"}.',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Follow-ups are stored on the business phone; sending a nudge uses SMS or email.",
  variants: {
    group: ["sections", "none"],
  },
  variantParts: { "group.none": { hides: ["overdue", "today", "upcoming", "completed"] } },
  parts: ["root", "overdue", "today", "upcoming", "completed", "status"],
  items: {
    key: "items",
    // prettier-ignore
    parts: ["root", "client_name", "reason", "due", "amount", "done", "snooze",
      "remind", "snooze_icon", "remind_icon"],
  },
  states: ["filled", "empty", "loading", "success", "error"],
  partTiers: { remind: "service" },
  actions: {
    items: { root: ["press"], done: ["check"], snooze: ["press"], remind: ["press"] },
    noGoto: { items: ["snooze", "remind"] },
    when: { root: { linked: true }, done: { done: false }, snooze: { done: false }, remind: { done: false } },
  },
  live: {
    checks: { done: "done" },
    derive: (input): c.Values => ({ items: orderFollowUps((input as QueueItems).items) }),
  },
  read: (input, _state, lang, _data, currency): string[] => {
    const today = followUpToday();
    return (input as QueueItems).items.map((row) => {
      const { reason, due, amount } = followUpDetails(row, today, lang, currency);
      return `${row.id} ${[reason, due, amount].filter(Boolean).join(" · ")}`;
    });
  },
} as const satisfies c.Meta;

const itemProps = z
  .strictObject({
    id: c.text(24).meta({ kind: "record_id", max: 24 }),
    clientName: c.text(24),
    kind: z.enum(["quote", "invoice", "checkin", "renewal"]),
    due: c.isoDate,
    note: c.text(48).optional(),
    amount: z.number().optional(),
    done: z.boolean(),
    goto: c.screenId.optional(),
  })
  .overwrite((row) => ({ ...row, linked: Boolean(row.goto) }));
type QueueItems = { items: z.output<typeof itemProps>[] };
export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    items: z.array(itemProps).min(1).max(6),
  })
  .refine(({ items }) => new Set(items.map((row) => row.id)).size === items.length, {
    path: ["items"],
    message: "Follow-up ids must be unique",
  });
export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const items = c.itemsOf(cast, 3);
  const thing = c.thingOf(cast);
  const due = followUpToday();
  return {
    items: (items.length ? items : [undefined]).map((item, index) => ({
      id: `followup_${index + 1}`,
      clientName: (item && c.titleOf(item, 24, thing)) || c.placeholderTitle(index, lang),
      note: (item && c.detailOf(item, 48, thing)) || undefined,
      kind: "checkin",
      due,
      done: false,
    })),
  };
}

// prettier-ignore
const ledge = { items: [
    { id: "lighting", clientName: "Anna Patel", kind: "quote", due: "2025-11-18", note: "Grow light installation", amount: 85, done: false, goto: "client" },
    { id: "winter_visit", clientName: "Leah Kim", kind: "checkin", due: "2026-11-21", note: "Greenhouse visit", done: false },
    { id: "winter", clientName: "Luis Reyes", kind: "checkin", due: "2027-12-02", note: "Winter watering plan", done: false },
  ] } satisfies z.input<typeof props>;
// prettier-ignore
export const examples = [
  ledge,
  { items: [
    { id: "october", clientName: "Ben Carter", kind: "invoice", due: "2025-11-18", amount: 120, done: false },
    { id: "walks", clientName: "Mia Jones", kind: "renewal", due: "2027-12-03", done: true },
  ] },
  { ...ledge, group: "none" },
  { ...ledge },
  { ...ledge },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("FollowUpQueue");
export const probes = [
  choose(
    "Prioritize who I should contact about unpaid invoices, outstanding quotes and upcoming client check-ins; let me snooze or send a nudge for each",
  ),
  choose("Tick off my three chores before leaving home", "Checklist"),
  write("I need to follow up with Anna Patel on a quote for 85 due 2025-11-18. It isn't done."),
  {
    ...write(
      "Follow up on Anna Patel's open quote due 2025-11-18 and Luis Reyes's open check-in due 2027-12-02. Show them in one list without section headings.",
    ),
    variant: { axis: "group", value: "none" },
  },
  read("Send Anna Patel a reminder about the grow light quote", { address: "f1/r1/remind", action: "press" }),
] satisfies c.Probe[];

type QueueProps = c.Props<typeof props, typeof meta>;

// prettier-ignore
function FollowUpRow({ row, density, today, grouped }: {
  row: QueueProps["items"][number]; density: c.ThemeDensity; today: string; grouped: boolean;
}) {
  const loading = kit.useComponentState() === "loading";
  const { lang, words: { followUpLabels: copy } } = kit.useWords(customersWordsFor);
  const { reason, date, priority, due, amount } = followUpDetails(row, today, lang, kit.useAppCurrency());
  const tone = priority === "overdue" ? "bad" : priority === "today" ? "warn" : priority === "done" ? "good" : "muted";
  return <kit.KitRow item={row.id} part={null} label={row.clientName} density={density} inset="none"
    trailing={loading ? <>
      {!row.done && <><kit.KitSkeleton shape="control" kind="quiet" /><kit.KitSkeleton shape="control" kind="quiet" /></>}
      <kit.KitSkeleton shape="control" kind="quiet" />
    </> : <>
      {!row.done && <>
        <kit.KitAction kind="quiet" icon="clock" part="snooze" a11y={copy.snooze(row.clientName)} />
        <kit.KitAction kind="quiet" icon="bell" part="remind" a11y={copy.remind(row.clientName)} />
      </>}
      <kit.KitCheck part="done" done={row.done} readonly={row.done}
        label={row.done ? copy.marked(row.clientName) : copy.mark(row.clientName)} />
    </>}>
    <kit.KitRow part={loading ? null : "root"} label={row.clientName} goto={loading ? undefined : row.goto} density={density} inline>
      {loading ? <kit.KitSkeleton shape="figure" inset="none" density={density}
        content={[["body", row.clientName], ["caption", reason], ["number", amount, "start", "compact"]]} /> : <>
        <kit.KitText part="client_name" lines={1} emphasis="strong" tone={row.goto ? "accent" : "text"}>{row.clientName}</kit.KitText>
        <kit.KitText part="reason" role="caption" tone="muted">{reason}</kit.KitText>
        {amount && <kit.KitText part="amount" role="number" numberScale="compact" lines={1} tabular>{amount}</kit.KitText>}
      </>}
    </kit.KitRow>
    <kit.KitContent leadingAlign="row" lead={<kit.KitTrail kind="badge" part="due" value={grouped ? date : due} tone={tone} />}>
      {null}
    </kit.KitContent>
  </kit.KitRow>;
}

// prettier-ignore
export function FollowUpQueue(input: QueueProps) {
  const { items, group } = kit.useLiveControls(meta, input) as QueueProps;
  const surface = "card";
  const density = kit.useKit().density;
  const state = kit.useComponentState();
  const loading = state === "loading";
  const { words: { followUpLabels: copy } } = kit.useWords(customersWordsFor);
  const today = followUpToday();
  const grouped = group === "sections";
  const render = (row: QueueProps["items"][number]) => <FollowUpRow key={row.id} {...{ row, density, today, grouped }} />;
  return <kit.KitCard part="root" padded {...{ density, surface }}>
    {state === "empty" ? <kit.KitEmpty part="status" icon="clock" decorativeIcon /> :
      state === "success" || state === "error" ?
        <kit.KitEmpty part="status" icon={state === "success" ? "check" : "bell_off"} decorativeIcon
          title={copy[state]} tone={state === "success" ? "good" : "neutral"} /> :
      !grouped ? <kit.KitGrid list arrange="rows" density={density}>{items.map(render)}</kit.KitGrid> :
        <kit.KitGrid list arrange="rows" listRowGap="cards" density={density}>
          {(["overdue", "today", "upcoming", "done"] as const).map((priority) => {
            const section = items.filter((row) => followUpPriority(row, today) === priority);
            return section.length > 0 && <kit.KitGrid key={priority} list arrange="rows" density={density}>
              <kit.KitContent density={density}>
                {loading ? <kit.KitSkeleton shape="figure" inset="none" density={density} content={[["label", copy[priority]]]} /> :
                  <kit.KitText role="label" tone="muted" part={priority === "done" ? "completed" : priority}>{copy[priority]}</kit.KitText>}
              </kit.KitContent>
              {section.map(render)}
            </kit.KitGrid>;
          })}
        </kit.KitGrid>}
  </kit.KitCard>;
}
