import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { expect, it } from "vitest";
import {
  archetypes,
  checkArchetypes,
  checkScreen,
  components,
  createRegistry,
  packArchetypes,
  packExamples,
  packOf,
  packReady,
  readComponent,
  readPrompt,
  writerFormat,
  type ArchetypeMeta,
  type CastLike,
  type Definition,
} from "@lmthing/ui/catalog";
import { createPreviewController, previewComponent } from "../../../../../../apps/gallery/app/draw";
import { adminListProbes, boardProbes, reportProbes, example } from "..";

const ids = ["Table", "Board", "FilterBar", "LineChart", "Heatmap", "BulkActions", "ActivityLog"] as const;
const draft = createRegistry({ packs: ["data"], includeDrafts: true });
const empty: CastLike = { things: [], items: [] };
const full: CastLike = {
  things: [{ type: "record", fields: ["a", "b"] }],
  items: [
    { id: "a1", type: "record", sample: true, a: "Sample title", b: "A brief detail" },
    { id: "a2", type: "record", sample: true, a: "Second title", b: "Second detail" },
  ],
};
const malformed: CastLike = {
  things: full.things,
  items: [{ id: "a1", type: "record", sample: true, a: [], b: "   " }],
};

it("scopes generated Writer choices and keeps drafts out of live registries", () => {
  const core = createRegistry();
  const live = createRegistry({ packs: ["data"] });
  const format = JSON.stringify(writerFormat(draft));
  const liveFormat = JSON.stringify(writerFormat(live));
  expect(draft.ids.filter((id) => id in packOf).sort()).toEqual([...ids].sort());
  for (const id of ids) {
    expect(packOf[id]).toBe("data");
    expect(core.resolve(id)).toBeUndefined();
    expect(format).toContain(`"const":"${id}"`);
    expect(liveFormat.includes(`"const":"${id}"`)).toBe(packReady("data"));
  }
});

it("validates the example byte for byte and parses every line", () => {
  expect(example).toBe(readFileSync(new URL("../example.jsonl", import.meta.url), "utf8"));
  expect(packExamples.data).toBe(example);
  const lines = example
    .trimEnd()
    .split("\n")
    .map((line) => JSON.parse(line));
  for (const { c, id, ...input } of lines) {
    expect(id).toMatch(/^[a-z][a-z0-9_]*$/);
    expect(draft.schema(c)?.safeParse(input).success, c).toBe(true);
  }
  expect(new Set(lines.map(({ id }) => id)).size).toBe(lines.length);
  for (const id of ids) expect(lines.some(({ c }) => c === id)).toBe(true);
  expect(lines.find(({ c }) => c === "Table")).toMatchObject({ selectable: true, sort: 1 });
  expect(lines.find(({ c }) => c === "Table").rows).toHaveLength(20);
  expect(lines.find(({ c }) => c === "Bars").style).toBe("share");
  expect(components.Bars.meta.signature).toBe("bars_grow");
});

it("validates all five layouts, their defaults, and compose coverage", () => {
  expect(checkArchetypes({ components, packOf, packArchetypes, archetypes })).toEqual([]);
  const layouts = [];
  const metas: readonly ArchetypeMeta[] = packArchetypes.data;
  for (const archetype of metas) {
    expect(draft.archetypes).toHaveProperty(archetype.id);
    expect(createRegistry().archetypes).not.toHaveProperty(archetype.id);
    for (const [layout, { recipe }] of Object.entries(archetype.layouts)) {
      layouts.push(`${archetype.id}/${layout}`);
      const screen = draft.defaultLines(archetype.id, layout, empty);
      expect(screen.components.map(({ c }) => c)).toEqual(recipe.map(({ allow }) => allow[0]));
      expect(checkScreen(screen, draft), `${archetype.id}/${layout}`).toEqual([]);
    }
  }
  expect(layouts.sort()).toEqual([
    "admin_list/cards",
    "admin_list/table",
    "board/kanban",
    "report/charts",
    "report/patterns",
  ]);
  expect(
    [...adminListProbes, ...boardProbes, ...reportProbes]
      .map(({ archetype, layout }) => `${archetype}/${layout}`)
      .sort(),
  ).toEqual(layouts);
  expect(draft.defaultLines("admin_list", "table", empty).components[2]).toMatchObject({
    selectable: true,
  });
  expect(draft.defaultLines("report", "charts", empty).components[4]).toMatchObject({ style: "share" });
});
it.each(ids)("%s validates examples and fallbacks and has well-formed probes", (id) => {
  const def: Definition = components[id];
  expect(def.examples.length).toBeGreaterThanOrEqual(2);
  for (const sample of def.examples) expect(def.props.safeParse(sample).success).toBe(true);
  for (const cast of [empty, full, malformed])
    expect(def.props.safeParse(def.fallback({ cast })).success).toBe(true);
  expect(JSON.stringify(def.fallback({ cast: empty }))).toContain("Item");
  expect(def.probes.some((probe) => probe.kind === "choose" && probe.expect === id)).toBe(true);
  expect(
    def.probes.some(
      (probe) =>
        probe.kind === "choose" &&
        probe.expect in components &&
        probe.expect !== id &&
        !(probe.expect in packOf),
    ),
  ).toBe(true);
  expect(def.probes.some((probe) => probe.kind === "write" && probe.expect === id)).toBe(true);
  const reads = def.probes.filter((probe) => probe.kind === "read");
  if (def.meta.actions) expect(reads.length).toBeGreaterThan(0);
  for (const {
    screen,
    task,
    expect: { address, action },
  } of reads) {
    const instance = address.split("/")[0]!;
    const reading = def.meta.selectionBinding
      ? readPrompt(def, screen, instance, task)
      : readComponent(def, def.examples[screen], instance).join("\n");
    expect(reading).toContain(`[${address} ${action}`);
  }
  expect(def.props.safeParse({ ...(def.examples[0] as object), colour: "#ff0000" }).success).toBe(false);
});

it("rejects inconsistent shapes, invalid references and values beyond the plan limits", () => {
  const { Table, Board, FilterBar, LineChart, Heatmap, BulkActions, ActivityLog } = components;
  const invalid: [Definition, unknown][] = [
    [Table, { ...Table.examples[0], rows: [{ cells: ["Fern", "2026-02-30", "Healthy"] }] }],
    [Table, { ...Table.examples[0], rows: [{ cells: ["Fern", "2026-02-28"] }] }],
    [Table, { ...Table.examples[0], sort: 3 }],
    [Table, { ...Table.examples[1], rows: [{ cells: ["R", "eight", 5] }] }],
    [Table, { ...Table.examples[1], rows: Array(21).fill(Table.examples[1]!.rows[0]) }],
    [Board, { ...Board.examples[0], cards: [{ title: "Repot", column: 3, goto: "fern" }] }],
    [Board, { ...Board.examples[0], cards: [{ title: "Repot", column: 0, goto: "Bad id" }] }],
    [FilterBar, { hint: "Find", filters: [{ label: "Room", options: ["Kitchen", "Study"], value: "Hall" }] }],
    [FilterBar, { hint: "Find", filters: [{ label: "Room", options: ["Kitchen"] }] }],
    [LineChart, { ...LineChart.examples[0], series: [{ label: "Ferns", values: [1, 2, 3, 4, 5] }] }],
    [LineChart, { ...LineChart.examples[0], labels: ["abcdefg", "B", "C", "D"] }],
    [Heatmap, { ...Heatmap.examples[0], style: "hours" }],
    [Heatmap, { ...Heatmap.examples[1], weeks: Heatmap.examples[0]!.weeks }],
    [Heatmap, { ...Heatmap.examples[0], weeks: Array(4).fill([0, 0, 0, 0, 0, 0]) }],
    [BulkActions, { ...BulkActions.examples[0], count: 3 }],
    [BulkActions, { items: [{ icon: "delete", label: "Delete", danger: true }] }],
    [
      ActivityLog,
      {
        entries: [
          { who: "Ana", photo: "https://example.org/photo", text: "Moved it", time: "09:10", goto: "fern" },
        ],
      },
    ],
  ];
  for (const [def, input] of invalid) expect(def.props.safeParse(input).success, def.meta.id).toBe(false);
});

it("routes only dangerous bulk actions through confirmation and hides all actions when empty", () => {
  const def: Definition = components.BulkActions;
  const input = def.examples[0];
  const probe = def.probes.find((probe) => probe.kind === "read")!;
  const read = readPrompt(def, probe.screen, "b1", probe.task);
  expect(def.meta.confirmParts).toContain("confirm");
  expect(def.meta.confirmParts).not.toContain("root");
  expect(read).toContain("source Table");
  expect(read).toContain("[source/r1/pick check:done]");
  expect(read).toContain("[source/r2/pick check:todo]");
  expect(read).toContain("1 selected — Select all [b1/all press]");
  expect(read).toContain("[b1/r1 press]");
  expect(read).not.toContain("[b1/r1/confirm press]");
  expect(read).not.toContain("[b1/r2 press]");
  expect(read).toContain("[b1/r2/confirm press]");
  expect(readComponent(def, input, "b1").join("\n")).not.toContain(" press]");
  expect(readComponent(def, input, "b1", "empty").join("\n")).not.toContain(" press]");
});

it("previews the bar with a real checked row without seeding the empty example", () => {
  const def: Definition = components.BulkActions;
  for (const example of def.examples) {
    const input = def.props.parse(example) as Record<string, unknown>;
    const preview = createPreviewController(def, input, "home", { state: "filled" });
    expect(preview?.read()).toContain(`1 selected — Select all [${previewComponent}/all press]`);
    expect(preview?.snapshotScreen().components.map(({ c }) => c)).toEqual(["Table", "BulkActions"]);
    expect(createPreviewController(def, input, "home", { state: "empty" })).toBeUndefined();
  }
});
