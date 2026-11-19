import { z } from "zod";
import { describe, expect, it } from "vitest";
import {
  components,
  readPrompt,
  text,
  type Definition,
  type Meta,
  type ScreenLike,
} from "@lmthing/ui/catalog";
import { createAgentAccess, createInteractionStore, createScreenController } from "@lmthing/ui/kit";
import { selectedIds } from "../scripts/build";

const base: Meta = {
  id: "Fixture",
  group: "input",
  purpose: "Choose an option",
  pick: "Choose an option",
  region: "body",
  weight: 1,
  tier: "phone",
  realPath: "Local selection",
  items: { key: "rows", parts: ["root"] },
  parts: ["root", "anyone"],
  actions: { items: { root: ["select"] }, parts: { anyone: ["select"] } },
};
function definition(select: NonNullable<Meta["select"]>): Definition {
  return {
    meta: { ...base, select, read: (props) => [`chosen ${String((props as { at?: unknown }).at)}`] },
    props: z.strictObject({
      rows: z.array(z.strictObject({ label: text(20), time: text(5), chosen: z.boolean().optional() })),
      at: z.union([z.number(), z.string()]).optional(),
    }),
    fallback: () => ({ rows: [] }),
    examples: [],
    probes: [],
  };
}
const rows = [
  { label: "First", time: "09:00" },
  { label: "Second", time: "10:00" },
];
function setup(select: NonNullable<Meta["select"]>, mounted: boolean) {
  const defs = { Fixture: definition(select) };
  const screen: ScreenLike = { id: "test", components: [{ id: "f1", c: "Fixture", rows }] };
  const runtime = mounted ? createScreenController({ screen, defs }) : undefined;
  const store = runtime?.store ?? createInteractionStore();
  return {
    runtime,
    store,
    agent: createAgentAccess({ defs, current: () => screen, store, ...(runtime ? { runtime } : {}) }),
  };
}

describe.each([true, false])("selection with controller: %s", (mounted) => {
  it.each([
    { select: { prop: "at", value: "index" } as const, first: 0, second: 1 },
    { select: { prop: "at", value: "position", parts: { anyone: 0 } } as const, first: 1, second: 2 },
    { select: { prop: "at", value: { field: "time" } } as const, first: "09:00", second: "10:00" },
  ])("infers $select.value and updates read after every change", ({ select, first, second }) => {
    const { runtime, agent, store } = setup(select, mounted);
    for (const [address, expected] of [
      ["f1/r1", first],
      ["test/f1/r2/root", second],
      ["f1/r1", first],
    ] as const) {
      expect(agent.act({ address, action: "select" }).ok).toBe(true);
      expect(agent.read()).toContain(`chosen ${expected}`);
      expect(store.get("test/f1/$at")).toBe(expected);
      if (runtime) expect(runtime.snapshotScreen().components[0]!.at).toBe(expected);
    }
    expect(agent.read()).not.toContain(`[f1/r2 select = ${JSON.stringify(second)}]`);
    if ("parts" in select) {
      expect(agent.act({ address: "f1/anyone", action: "select" }).ok).toBe(true);
      expect(agent.read()).toContain("chosen 0");
      expect(agent.act({ address: "f1/r2", action: "select", value: 2 }).ok).toBe(true);
      expect(agent.read()).toContain("chosen 2");
    }
    runtime?.dispose();
  });
  it("rejects wrong explicit values atomically and accepts matching field values", () => {
    const { runtime, agent, store } = setup({ prop: "at", value: { field: "time" } }, mounted);
    expect(agent.act({ address: "f1/r2", action: "select", value: "10:00" }).ok).toBe(true);
    const before = store.snapshot();
    expect(
      agent.act([
        { address: "f1/r1", action: "select" },
        { address: "f1/r2", action: "select", value: "09:00" },
      ]),
    ).toMatchObject({ ok: false, code: "invalid_value", at: 1 });
    expect(store.snapshot()).toEqual(before);
    expect(agent.read()).toContain("chosen 10:00");
    runtime?.dispose();
  });
  it("sets and resets every declared row flag", () => {
    const { runtime, agent, store } = setup({ prop: "chosen", value: "index", mode: "flags" }, mounted);
    for (const index of [1, 0, 1]) {
      expect(agent.act({ address: `f1/r${index + 1}`, action: "select" }).ok).toBe(true);
      expect([store.get("test/f1/r1"), store.get("test/f1/r2")]).toEqual([index === 0, index === 1]);
      if (runtime)
        expect(
          (runtime.snapshotScreen().components[0]!.rows as { chosen: boolean }[]).map((row) => row.chosen),
        ).toEqual([index === 0, index === 1]);
    }
    runtime?.dispose();
  });
});

it("keeps every core read probe prompt identical when selection metadata is present", () => {
  for (const id of selectedIds(["Calendar", "Choice", "Segmented", "TabBar", "Sheet", "Chips"] as const)) {
    const def = components[id];
    const { select: _select, ...meta } = def.meta;
    for (const probe of def.probes) {
      if (probe.kind !== "read") continue;
      const instance = probe.expect.address.split("/")[0]!;
      expect(readPrompt(def, probe.screen, instance, probe.task)).toBe(
        readPrompt({ ...def, meta }, probe.screen, instance, probe.task),
      );
    }
  }
});
