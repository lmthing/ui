import { z } from "zod";
import * as c from "../catalog";
import * as kit from "../kit";
import { prompt } from "../entry/prompt-WorkQueueRow.generated";

export const meta = {
  id: "WorkQueueRow",
  status: "ready",
  group: "action",
  tier: "phone",
  pick: prompt.pick,
  purpose: prompt.purpose,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  realPath: "Open a stable work record for review without completing it or making its decision.",
  variants: { detail: ["full", "brief"] },
  parts: ["root", "empty"],
  items: {
    key: "rows",
    parts: [
      "root",
      "title",
      "record",
      "flags",
      "status",
      "owner",
      "due",
      "priority",
      "action",
      "action_label",
    ],
  },
  variantParts: { "detail.brief": { hides: ["owner"] } },
  actions: { items: { action: ["press"] }, when: { action: { linked: true } } },
  states: ["filled", "empty", "loading"],
  readInState: (_input, state) => state === "empty",
  read: (input, state, lang): string[] => {
    const { workQueue } = c.wordsFor(lang);
    if (state === "empty") return [workQueue.empty];
    const { rows } = input as z.output<typeof props>;
    return rows.flatMap(({ priority }, index) =>
      priority === "normal" ? [] : [`r${index + 1} ${workQueue[priority]}`],
    );
  },
} as const satisfies c.Meta;

const row = z
  .strictObject({
    title: c.text(40),
    recordRef: c.text(20),
    status: c.text(20),
    owner: c.text(32).optional(),
    due: c.text(32).optional(),
    priority: z.enum(["normal", "high", "urgent"]).default("normal").meta({ read: false }),
    action: c.text(24).optional(),
    goto: c.screenId.optional(),
  })
  .refine(({ action, goto }) => Boolean(action) === Boolean(goto), { path: ["goto"] });

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    rows: z.array(row).min(1).max(6),
  })
  .overwrite((input) => ({
    ...input,
    rows: input.rows.map((row) => ({
      ...row,
      linked: Boolean(row.goto),
      owner: input.detail === "full" ? row.owner : undefined,
    })),
  }));

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const items = c.itemsOf(cast, 3);
  return {
    rows: (items.length ? items : [undefined]).map((item, index) => ({
      title: (item && c.titleOf(item, 40, thing)) || c.placeholderTitle(index, lang),
      recordRef: c.placeholderValue,
      status: c.wordsFor(lang).workQueue.waiting,
    })),
  };
}

const garden = {
  rows: [
    {
      title: "Inspect spider mites on orchids",
      recordRef: "GH-042",
      status: "Needs review",
      owner: "Mira",
      due: "Today, 10:30",
      priority: "urgent",
      action: "Review inspection",
      goto: "orchid_inspection",
    },
    {
      title: "Confirm fern delivery tray",
      recordRef: "GH-043",
      status: "Waiting on supplier",
      due: "Tomorrow",
    },
  ],
} satisfies z.input<typeof props>;
export const examples = [
  garden,
  {
    rows: [
      {
        title: "Reassign Meadow loop",
        recordRef: "WK-314",
        status: "Unassigned",
        owner: "Dispatch desk",
        due: "Before 14:00",
        priority: "high",
        action: "Assign walker",
        goto: "meadow_assignment",
      },
    ],
  },
  { ...garden, detail: "brief" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("WorkQueueRow");
export const probes = [
  choose(
    "Give dispatch a list of work waiting for a decision. For each job show its record number, owner, deadline, urgency and current status, with one button to review it.",
  ),
  choose("Show the names of four plants in my collection so I can browse and open one.", "List"),
  write(
    "Reassign Meadow loop, record WK-314. It's Unassigned, due Before 14:00 and high priority. Show Dispatch desk as owner and an Assign walker button opening meadow_assignment.",
  ),
  {
    ...write(
      "Show urgent orchid inspection GH-042, status Needs review and due Today at 10:30. Keep its owner Mira in the data but hide the owner on screen.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Review the spider mite inspection", { address: "w1/r1/action", action: "press" }),
] satisfies c.Probe[];

type QueueProps = c.Props<typeof props, typeof meta>;

export function WorkQueueRow({ rows }: QueueProps) {
  const { workQueue } = kit.useWords().words;
  const density = kit.useKit().density;
  const content = (
    <kit.KitRowGroup>
      {rows.map((row) => (
        <QueueRow key={row.id} row={row} />
      ))}
    </kit.KitRowGroup>
  );
  return (
    <kit.KitCard part="root" style="inset" padded density={density}>
      <kit.KitState part="empty" message={workQueue.empty} loading={content}>
        {content}
      </kit.KitState>
    </kit.KitCard>
  );
}

function QueueRow({ row }: { row: QueueProps["rows"][number] }) {
  const { workQueue } = kit.useWords().words;
  const filled = kit.useComponentState() === "filled";
  return (
    <kit.KitRow item={row.id} label={row.title} inset="none">
      <kit.KitContent rhythm="flush">
        <kit.KitLayoutText line={{ text: row.title, part: "title", strong: true }} />
        <kit.KitLayoutText line={{ text: row.recordRef, part: "record", role: "meta", tone: "muted" }} />
        <kit.KitLayoutText line={{ text: row.due, part: "due", role: "meta" }} />
        <kit.KitLayoutText line={{ text: row.owner, part: "owner", role: "meta", tone: "muted" }} />
        <kit.KitTrack part="flags">
          <kit.KitTrail part="status" kind="badge" value={row.status} />
          {row.priority !== "normal" && (
            <kit.KitTrail
              kind="badge"
              part="priority"
              value={workQueue[row.priority]}
              tone={row.priority === "urgent" ? "bad" : "warn"}
            />
          )}
        </kit.KitTrack>
        {row.action &&
          row.goto &&
          (filled ? (
            <kit.KitAction
              part="action"
              action="press"
              kind="secondary"
              label={row.action}
              goto={row.goto}
              contentParts={{ label: "action_label" }}
            />
          ) : (
            <kit.KitSkeleton shape="control" kind="secondary" label={row.action} />
          ))}
      </kit.KitContent>
    </kit.KitRow>
  );
}
