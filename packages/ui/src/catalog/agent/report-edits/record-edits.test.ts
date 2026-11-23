import { expect, it, vi } from "vitest";
import { z } from "zod";
import { planAct, projectDeviceData, readScreen } from "../index";
import type { Definition } from "../../probes";
import { createAgentAccess, createInteractionStore, createScreenController } from "../../../kit/interact";

const props = z.strictObject({
  scope: z.string(),
  revision: z.int().min(1).max(3),
  rows: z
    .array(
      z.strictObject({
        ref: z.string(),
        title: z.string(),
        date: z.iso.date().optional(),
        goto: z.string().optional(),
      }),
    )
    .max(4),
});
const seed = {
  scope: "a",
  revision: 1,
  rows: [
    { ref: "x", title: "First", goto: "next" },
    { ref: "y", title: "Second" },
  ],
};
const def: Definition = {
  props,
  meta: {
    id: "Baseline",
    purpose: "",
    pick: "",
    region: "body",
    group: "input",
    weight: 1,
    tier: "phone",
    realPath: "",
    deviceData: ["gates", "acceptance"],
    actions: { items: { accept: ["check"], remove: ["press"] } },
    items: {
      key: "rows",
      parts: ["accept", "remove"],
      records: {
        keys: ["ref"],
        scope: ["scope"],
        parts: { accept: { action: "check", date: "date" }, remove: { action: "press", remove: true } },
        revision: "revision",
        canRemove: (row, input, data) =>
          !data.gates?.some(
            (gate) =>
              (gate as { scope: string }).scope === input.scope && (gate as { ref: string }).ref === row.ref,
          ),
        localDate: (now) => new Date(now - 4 * 3600000).toISOString().slice(0, 10),
        snapshot: {
          kind: "acceptance",
          keys: ["scope", "ref"],
          record: ({ ref, date }, { scope }) => ({ scope, ref, date }),
          include: ({ date }) => date !== undefined,
        },
      },
    },
  },
  examples: [],
  probes: [],
  fallback: () => seed,
};
const defs = { Baseline: def };
const screen = { id: "edit", components: [{ id: "b1", c: "Baseline", ...seed }] };
const now = () => Date.parse("2026-03-08T02:00:00Z");
const check = { address: "b1/r1/accept", action: "check" };
const remove = { address: "b1/r1/remove", action: "press" };
const confirm = { address: "confirm/confirm", action: "press" };
const cancel = { address: "confirm/cancel", action: "dismiss" };

it("retains host addresses through confirmed record edits and removal", () => {
  const rows = [
    { ...seed.rows[0]!, id: "r7" },
    { ...seed.rows[1]!, id: "r5" },
  ];
  const host = { ...screen, components: [{ ...screen.components[0]!, rows }] };
  const runtime = createScreenController({ screen: host, defs, now });
  try {
    expect(runtime.act([{ ...check, address: "b1/r7/accept" }, confirm]).ok).toBe(true);
    expect(runtime.read()).toContain("[b1/r7/accept check:done]");
    expect(runtime.act([{ ...remove, address: "b1/r7/remove" }, confirm]).ok).toBe(true);
    expect(runtime.snapshotScreen().components[0]?.rows).toEqual([rows[1]]);
    expect(runtime.read()).toContain("[b1/r5/remove press]");
  } finally {
    runtime.dispose();
  }
});

it.each([
  { previousId: undefined, incomingId: "r7", current: "r7" },
  { previousId: "r1", incomingId: undefined, current: "r2" },
])(
  "prefers incoming ids to saved ids while replaying an edit at $current",
  ({ previousId, incomingId, current }) => {
    const store = createInteractionStore();
    const first = previousId ? { ...seed.rows[0]!, id: previousId } : seed.rows[0]!;
    const before = { ...screen, components: [{ ...screen.components[0]!, rows: [first, seed.rows[1]!] }] };
    const previous = createScreenController({ screen: before, defs, now, store });
    try {
      expect(previous.act([check, confirm]).ok).toBe(true);
    } finally {
      previous.dispose();
    }
    const rows = [
      { ...seed.rows[1]!, id: "r1" },
      incomingId ? { ...seed.rows[0]!, id: incomingId } : seed.rows[0]!,
    ];
    const host = { ...screen, components: [{ ...screen.components[0]!, rows }] };
    const runtime = createScreenController({ screen: host, defs, now, store });
    try {
      expect(runtime.snapshotScreen().components[0]?.rows).toEqual(
        expect.arrayContaining([{ ...rows[1], date: "2026-03-07" }, rows[0]]),
      );
      expect(runtime.read()).toContain(`[b1/${current}/accept check:done]`);
      expect(runtime.read()).toContain("[b1/r1/accept check:todo]");
    } finally {
      runtime.dispose();
    }
  },
);

it("records or clears a local date, revision and shared snapshot in the same store notification", () => {
  const store = createInteractionStore();
  const unrelated = { scope: "b", ref: "x", date: "2026-03-07" };
  const data = { acceptance: [unrelated] };
  const onLink = vi.fn();
  const runtime = createScreenController({ screen, defs, store, now, deviceData: data, onLink });
  const observer = createScreenController({
    screen: { ...screen, id: "observe" },
    defs,
    store,
    deviceData: data,
  });
  const readings: unknown[] = [];
  store.subscribe(() =>
    readings.push([
      runtime.snapshotScreen().components[0]?.revision,
      observer.deviceDataFor("b1").acceptance,
    ]),
  );
  expect(planAct(screen, defs, {}, [check]).ok).toBe(true);
  expect(runtime.act({ ...check, value: false }).ok).toBe(false);
  expect(runtime.act(check).ok).toBe(true);
  expect(readings).toEqual([[1, [unrelated]]]);
  expect(runtime.act(cancel).ok).toBe(true);
  expect(runtime.act([check, confirm, { ...remove, address: "absent" }]).ok).toBe(false);
  expect(runtime.act([check, confirm], { dryRun: true }).ok).toBe(true);
  expect(readings).toHaveLength(2);
  expect(runtime.act([{ ...check, value: true }, confirm]).ok).toBe(true);
  expect(readings[2]).toEqual([2, [unrelated, { scope: "a", ref: "x", date: "2026-03-07" }]]);
  expect(runtime.read()).toContain("[b1/r1/accept check:done]");
  expect(runtime.act({ ...check, value: true }).ok).toBe(false);
  expect(runtime.act([{ ...check, value: false }, confirm]).ok).toBe(true);
  expect(readings[3]).toEqual([3, [unrelated]]);
  expect(runtime.read()).toContain("[b1/r1/accept check:todo]");
  expect(runtime.act([check, confirm]).ok).toBe(false);
  expect(readings).toHaveLength(4);
  expect(data.acceptance).toEqual([unrelated]);
  expect(onLink).not.toHaveBeenCalled();
});

it("rechecks gate references on confirmation and preserves other addressed rows on removal", () => {
  const data = {
    gates: [] as { scope: string; ref: string }[],
    acceptance: [{ scope: "a", ref: "x", date: "2026-03-07" }],
  };
  const store = createInteractionStore();
  const agent = createAgentAccess({ defs, store, current: () => screen, deviceData: data });
  expect(agent.act(remove).ok).toBe(true);
  data.gates.push({ scope: "a", ref: "x" });
  expect(agent.act(confirm).ok).toBe(false);
  expect(agent.act(cancel).ok).toBe(true);
  expect(readScreen(screen, defs, {}, undefined, data)).not.toContain("[b1/r1/remove press]");
  expect(planAct(screen, defs, {}, [remove], null, "planner", data).ok).toBe(false);
  data.gates[0]!.scope = "b";
  expect(agent.act([remove, confirm]).ok).toBe(true);
  expect(agent.read()).not.toContain("[b1/r1/remove press]");
  expect(agent.read()).toContain("[b1/r2/remove press]");
  expect(projectDeviceData(data, store.snapshot("elsewhere"))?.acceptance).toEqual([]);
  const otherProject = { ...screen, components: [{ ...screen.components[0]!, scope: "b" }] };
  expect(readScreen(otherProject, defs, store.snapshot("edit"))).toContain("[b1/r1/remove press]");
  store.reset("edit");
  expect(projectDeviceData(data, store.snapshot("elsewhere"))?.acceptance).toEqual(data.acceptance);
});
