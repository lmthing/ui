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

export const roundTwoRoots = [...queueScreens, ...rollupScreens].map(({ id }) => id);
export const roundTwoScreens = Object.fromEntries(
  [
    ...queueScreens,
    ...rollupScreens,
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
  ].map((screen) => [screen.id, screen]),
);
