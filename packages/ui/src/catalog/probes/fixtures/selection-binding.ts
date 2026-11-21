import { z } from "zod";
import type { BoundSelection, ScreenLike, Values } from "../../agent";
import type { Definition } from "../index";

const base = {
  group: "data",
  purpose: "Read records.",
  pick: "Selection test fixture.",
  region: "body",
  weight: 1,
  tier: "phone",
  realPath: "Read local records.",
} as const;
const rows = [
  { label: "One", checked: false, visible: true },
  { label: "Two", checked: false, visible: true },
  { label: "Unavailable", checked: true, visible: false },
];
function table(): Definition {
  return {
    meta: {
      ...base,
      id: "Table",
      items: { key: "rows", parts: ["pick"], visibleWhen: { visible: true } },
      live: { checks: { pick: "checked" } },
      actions: {
        parts: { header: ["select"] },
        items: { root: ["press"], pick: ["check"] },
        when: { pick: { selectable: true } },
      },
      select: { prop: "sort", choices: { header: [0, 1] } },
    },
    props: z.strictObject({
      rows: z.array(z.strictObject({ label: z.string(), checked: z.boolean(), visible: z.boolean() })),
      selectable: z.boolean().default(true),
      sort: z.number().optional(),
    }),
    fallback: () => ({ rows }),
    examples: [],
    probes: [],
  };
}
function bulk(): Definition {
  return {
    meta: {
      ...base,
      id: "BulkActions",
      parts: ["root", "all"],
      items: { key: "items", parts: ["root"] },
      actions: { parts: { all: ["press"] }, items: { root: ["press"] } },
      selectionBinding: { component: "Table", check: "pick", all: "all" },
      read: (props) => [
        `selected ${((props as Values).$selection as BoundSelection)?.selected.join(",") || "none"}`,
      ],
    },
    props: z.strictObject({ items: z.array(z.strictObject({ label: z.string() })) }),
    fallback: () => ({}),
    examples: [],
    probes: [],
  };
}
const tableEntry = { id: "table", c: "Table", rows };
export const allStep = { address: "home/bulk/all", action: "press" };
export const checkStep = { address: "home/table/r2/pick", action: "check" };

export function selectionFixture(binding: Partial<NonNullable<Definition["meta"]["selectionBinding"]>> = {}) {
  const consumer = bulk();
  const BulkActions = {
    ...consumer,
    meta: { ...consumer.meta, selectionBinding: { ...consumer.meta.selectionBinding!, ...binding } },
  };
  const sourceScreen: ScreenLike = {
    id: "home",
    components: [tableEntry, { id: "bulk", c: "BulkActions", items: [{ label: "Archive" }] }],
  };
  return { screen: sourceScreen, defs: { BulkActions, Table: table() }, tableEntry };
}
