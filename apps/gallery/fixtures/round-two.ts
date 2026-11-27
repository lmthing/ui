import { clip, components, type Component, type ScreenLike } from "@lmthing/ui/catalog";

function comparison(id: string, title: string, before: Component[], after: Component[]): ScreenLike[] {
  const header = { id: "h1", c: "Header", title };
  return [
    { id: `${id}_before`, components: [header, ...before] },
    { id, components: [header, ...after] },
  ];
}

const queue = components.WorkQueueRow.examples.slice(0, 2);
const rollups = components.RollupRows.examples.slice(0, 2);
const queueScreens = queue.flatMap((example, index) =>
  comparison(
    `round2_queue_${index + 1}`,
    index ? "Dispatch desk" : "Glasshouse queue",
    [
      {
        id: "queue",
        c: "List",
        rows: example.rows.map((row) => ({
          title: clip(row.title, 28),
          meta: [row.recordRef, "owner" in row ? row.owner : undefined].filter(Boolean).join(" · "),
          fact: row.due,
          badge: row.status,
          ...("goto" in row && row.goto ? { goto: row.goto } : {}),
        })),
      },
    ],
    [{ id: "queue", c: "WorkQueueRow", ...example }],
  ),
);
const rollupScreens = rollups.flatMap((example, index) =>
  comparison(
    `round2_rollup_${index + 1}`,
    index ? "Walking teams" : "Glasshouse meters",
    [
      { id: "period", c: "SectionTitle", text: example.period },
      {
        id: "figures",
        c: "Stats",
        tiles: example.rows.map(({ label, value }) => ({ label, value: `${value}`, unit: example.unit })),
      },
    ],
    [{ id: "figures", c: "RollupRows", ...example }],
  ),
);

function destination(id: string, title: string, text: string): ScreenLike {
  return {
    id,
    components: [
      { id: "h1", c: "Header", title, style: "back" },
      { id: "detail", c: "Note", text },
    ],
  };
}

const record = {
  id: "record",
  c: "Timeline",
  style: "record",
  record: "Fern fungus inspection",
  reference: "GH-042",
  current: "Follow-up booked",
  items: [
    { time: "Thu 26 Nov", title: "Follow-up booked", summary: "A gardener will visit tomorrow." },
    { time: "Wed 25 Nov", title: "Inspection requested", summary: "We received your request." },
  ],
};

const reviewScreens: ScreenLike[] = [
  {
    id: "round2_record",
    components: [
      { id: "h1", c: "Header", title: "Inspection history" },
      record,
      {
        id: "detail",
        c: "Button",
        label: "View staff notes",
        emphasis: "quiet",
        goto: "round2_record_staff",
      },
    ],
  },
  {
    id: "round2_record_staff",
    components: [
      { id: "h1", c: "Header", title: "Inspection history", style: "back" },
      {
        ...record,
        audience: "detail",
        items: record.items.map((item, index) =>
          index ? item : { ...item, meta: "Bench 4 · check new fronds" },
        ),
      },
    ],
  },
  {
    id: "round2_staffing",
    components: [
      { id: "h1", c: "Header", title: "Walk staffing" },
      { id: "agenda", c: "SlotAgenda", ...components.SlotAgenda.examples[3]! },
    ],
  },
  {
    id: "round2_details",
    components: [
      { id: "h1", c: "Header", title: "Clover’s walk" },
      { id: "files", c: "FileList", ...components.FileList.examples[1]! },
      {
        id: "facts",
        c: "KeyValue",
        pairs: [
          { label: "Walk status", value: "Confirmed", status: true, tone: "good" },
          {
            label: "Pickup notes",
            value: "Use the Meadow gate and bring the spare lead from the front desk.",
          },
        ],
      },
    ],
  },
  {
    id: "round2_outcome",
    components: [
      { id: "h1", c: "Header", title: "Repotting request" },
      { id: "receipt", c: "Success", ...components.Success.examples[4]! },
    ],
  },
  {
    id: "round2_filter",
    components: [
      { id: "h1", c: "Header", title: "Riverside walks" },
      { id: "results", c: "Empty", ...components.Empty.examples[5]! },
    ],
  },
];

export const roundTwoRoots = [...queueScreens, ...rollupScreens, ...reviewScreens].map(({ id }) => id);
export const roundTwoScreens = Object.fromEntries(
  [
    ...queueScreens,
    ...rollupScreens,
    ...reviewScreens,
    destination(
      "orchid_inspection",
      "Orchid inspection · GH-042",
      "Mira checks the affected leaves by 10:30.",
    ),
    destination("meadow_assignment", "Meadow loop · WK-314", "Dispatch must assign a walker before 14:00."),
    destination(
      "glasshouse_water",
      "Glasshouse water · November",
      "The 36 L total combines the bench and hanging-pot readings.",
    ),
    destination("staff_meadow", "Meadow group walk", "Nia is assigned from 08:00 to 09:30."),
    destination(
      "river_route",
      "River route notes.pdf",
      "Preview of the two-page briefing for the Riverside route.",
    ),
  ].map((screen) => [screen.id, screen]),
);
