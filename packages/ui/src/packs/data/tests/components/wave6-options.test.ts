import { components, migrateLine, readScreen, type ScreenLike } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { describe, expect, it, vi } from "vitest";
import { addressedElements, renderInstance } from "../../../../../test/render";

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const { ActivityLog, Board, LineChart, Table } = components;
const screen = (c: string, input: object): ScreenLike => ({
  id: "home",
  components: [{ ...input, c, id: "c1" }],
});

describe("ActivityLog Wave 6", () => {
  const log = {
    kind: "updated",
    entries: [
      { ...ActivityLog.examples[0]!.entries[0]!, kind: "created" },
      { ...ActivityLog.examples[0]!.entries[1]!, kind: "updated", diff: { old: "Hall", new: "Study" } },
    ],
  };

  it("shows the starting filter and change text with the unfiltered addresses", () => {
    const parts = addressedElements(renderInstance("ActivityLog", log, "filled", theme));
    expect(parts.has("home/c1/r1/root")).toBe(false);
    expect(parts.get("home/c1/r2/diff")?.text).toEqual(["Hall → Study"]);
    expect(parts.has("home/c1/kind")).toBe(true);
    expect(ActivityLog.props.safeParse({ ...log, kind: "deleted" }).success).toBe(false);
    expect(
      ActivityLog.props.safeParse({ entries: [{ ...log.entries[0], diff: { old: "Hall" } }] }).success,
    ).toBe(false);
  });

  it("replaces filters, restores all rows, and rejects hidden links and absent choices", () => {
    const onLink = vi.fn();
    const seed = screen("ActivityLog", log);
    const controller = createScreenController({ screen: seed, defs: { ActivityLog }, onLink });
    try {
      const select = (value: string) => controller.act({ address: "c1/kind", action: "select", value });
      expect(controller.read()).toContain("Hall → Study");
      expect(controller.read()).not.toContain("[c1/r1 press");
      expect(controller.press("c1/r1").ok).toBe(false);
      expect(select("deleted").ok).toBe(false);
      expect(controller.read()).toContain("All changes");
      expect(select("Created").ok).toBe(true);
      expect(controller.read()).not.toContain("Hall → Study");
      expect(controller.press("c1/r1").ok).toBe(true);
      expect(onLink).toHaveBeenCalledWith("fern", "home/c1/r1");
      expect(select("All changes").ok).toBe(true);
      expect(controller.read()).toContain("[c1/r2 press");
      expect(controller.read()).toContain("[c1/r1 press");
      expect(controller.snapshotScreen()).toEqual(seed);
    } finally {
      controller.dispose();
    }
  });
});

it("groups Board cards by swimlane while preserving repeated moves and link identities", () => {
  const input = {
    columns: Board.examples[0]!.columns,
    cards: Board.examples[0]!.cards.map((card, index) => ({
      ...card,
      swimlane: index ? undefined : "Urgent",
    })),
  };
  const parts = addressedElements(renderInstance("Board", input, "filled", theme));
  for (const part of ["columns", "swimlane_1", "swimlane_2", "r1/root", "r2/root"])
    expect(parts.has(`home/c1/${part}`)).toBe(true);
  const onLink = vi.fn();
  const controller = createScreenController({ screen: screen("Board", input), defs: { Board }, onLink });
  try {
    expect(controller.read()).toContain("Urgent — Waiting (1) · In care (0)");
    expect(controller.read()).toContain("Unassigned — Waiting (0) · In care (1)");
    for (const value of ["In care", "Recovered"])
      expect(controller.act({ address: "c1/r1", action: "move", value }).ok).toBe(true);
    expect(controller.read()).toContain("Urgent — Waiting (0) · In care (0) · Recovered (1)");
    expect(controller.press("c1/r1").ok).toBe(true);
    expect(onLink).toHaveBeenCalledWith("fern", "home/c1/r1");
  } finally {
    controller.dispose();
  }
});

it("draws the LineChart goal within the scale and names the reporting period without changing point IDs", () => {
  const input = { ...LineChart.examples[0]!, goal: -2, range: "90d" };
  const html = renderInstance("LineChart", input, "filled", theme);
  const parts = addressedElements(html);
  expect(parts.get("home/c1/range")?.text).toEqual(["Last 90 days"]);
  expect(parts.has("home/c1/r6/root")).toBe(true);
  expect(html).toContain("Goal: -2 visits");
  expect(html).toContain('stroke-dasharray="');
  const read = readScreen(screen("LineChart", input), { LineChart });
  expect(read).toContain("Goal: -2 visits — 6 — 2 — -2");
  expect(read).toContain("Last 90 days");
  expect(read).toContain("[c1/r6 select]");
  expect(LineChart.props.safeParse({ ...input, goal: Infinity }).success).toBe(false);
  expect(LineChart.props.safeParse({ ...input, range: "forever" }).success).toBe(false);
});

const tableInput = Table.examples[2]!;

it("drops legacy Table spacing and keeps the migrated or explicit group", () => {
  for (const [style, props, group] of [
    ["compact", {}, "none"],
    ["compact", { density: "comfortable" }, "none"],
    ["grouped", {}, "sections"],
    ["grouped", { group: "none" }, "none"],
  ] as const) {
    const { c, id, ...wire } = migrateLine({
      ...Table.examples[0]!,
      ...props,
      c: "Table",
      id: "t1",
      style,
    });
    expect([c, id]).toEqual(["Table", "t1"]);
    expect(wire).not.toHaveProperty("style");
    expect(wire).not.toHaveProperty("density");
    expect(Table.props.parse(wire).group).toBe(group);
  }
});

it("groups and sorts numbered rows, keeping summary and row checks independent", () => {
  const wire = { ...tableInput, sort: 2, detail: "brief" };
  const parts = addressedElements(renderInstance("Table", wire, "filled", theme));
  expect(parts.get("home/c1/r3/group_heading")?.text).toEqual(["Booked"]);
  expect(parts.has("home/c1/r1/group_heading")).toBe(false);
  expect(parts.has("home/c1/r1/pick")).toBe(true);
  expect(parts.has("home/c1/summary")).toBe(true);
  expect(parts.has("home/c1/count")).toBe(false);
  const read = readScreen(screen("Table", wire), { Table });
  expect(read.indexOf("r3: Park loop")).toBeLessThan(read.indexOf("r1: Canal loop"));
  expect(read).toContain("Total · Walks: 16");
});

it("keeps a long section label at the first record's heading address", () => {
  const label = "Awaiting review tomorrow";
  const rows = [{ cells: ["Canal loop", label, 8], goto: "canal" }, { cells: ["Park loop", label, 3] }];
  const parts = addressedElements(renderInstance("Table", { ...tableInput, rows }, "filled", theme));
  expect(parts.get("home/c1/r1/group_heading")?.text).toEqual([label]);
  expect(parts.has("home/c1/r2/group_heading")).toBe(false);
  expect(parts.get("home/c1/r1/root")?.attributes).toContain('role="link"');
  expect(parts.has("home/c1/r2/pick")).toBe(true);
});

it("routes export only to an admitted service host, not to a screen link", async () => {
  let rejectExport!: () => void;
  const response = new Promise<{ status: "rejected" }>((resolve) => {
    rejectExport = () => resolve({ status: "rejected" });
  });
  const run = vi
    .fn()
    .mockImplementationOnce(() => response)
    .mockReturnValueOnce({ status: "accepted" as const });
  const onLink = vi.fn();
  const seed = screen("Table", tableInput);
  const offline = createScreenController({ screen: seed, defs: { Table } });
  const online = createScreenController({
    screen: seed,
    defs: { Table },
    onLink,
    hostCommands: { commands: { "data.exportTable": { allows: () => true, run } } },
  });
  try {
    expect(offline.read()).not.toContain("[c1/export press");
    expect(offline.press("c1/export").ok).toBe(false);
    expect(online.read()).toContain("[c1/export press !needs-service]");
    expect(online.act({ address: "c1/export", action: "press" }).ok).toBe(true);
    expect(run.mock.calls.length).toBe(1);
    expect(onLink).not.toHaveBeenCalled();
    expect(online.read()).toContain("c1 operation data.exportTable pending");
    expect(online.read()).not.toContain("[c1/header select");
    expect(online.read()).toContain("[c1/r1/pick check");
    expect(online.press("c1/export").ok).toBe(false);
    rejectExport();
    await Promise.resolve();
    expect(online.read()).toContain("c1 operation data.exportTable rejected");
    expect(online.read()).toContain("[c1/header select");
    expect(online.press("c1/export").ok).toBe(true);
    await Promise.resolve();
    expect(online.read()).toContain("c1 operation data.exportTable accepted");
    expect(online.snapshotScreen()).toEqual(seed);
  } finally {
    offline.dispose();
    online.dispose();
  }
});
