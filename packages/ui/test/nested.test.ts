import { z } from "zod";
import { describe, expect, it } from "vitest";
import {
  affordancesOf,
  components,
  readPrompt,
  stampItemIds,
  text,
  type Definition,
  type ScreenLike,
} from "@lmthing/ui/catalog";
import { createAgentAccess, createInteractionStore, createScreenController } from "@lmthing/ui/kit";
import { selectedEntries } from "../scripts/build";

const props = z.strictObject({
  groups: z
    .array(
      z.strictObject({
        label: text(16),
        symptoms: z
          .array(
            z.strictObject({
              label: text(16),
              on: z.boolean().default(false),
              severity: z.int().min(0).max(5).default(0),
            }),
          )
          .min(1)
          .max(8),
      }),
    )
    .min(1)
    .max(4),
});
const definition = {
  meta: {
    id: "NestedFixture",
    group: "input",
    purpose: "Edit grouped nested controls",
    pick: "A nested control fixture",
    region: "body",
    weight: 1,
    tier: "phone",
    realPath: "Local controls",
    items: {
      key: "groups",
      parts: ["root", "label"],
      nested: {
        key: "symptoms",
        parts: {
          symptom: { action: "toggle", prop: "on" },
          severity: { action: "set", prop: "severity", min: 0, max: 5, integer: true, when: "symptom" },
        },
      },
    },
    read: (input) =>
      (input as z.output<typeof props>).groups.flatMap((group) =>
        group.symptoms.map((item) => `${item.label}: ${item.on ? "on" : "off"} ${item.severity}/5`),
      ),
  },
  props,
  fallback: () => ({ groups: [] }),
  examples: [],
  probes: [],
} satisfies Definition;
const groups = [
  { label: "First group", symptoms: [{ label: "First", on: true, severity: 2 }, { label: "Second" }] },
  { label: "Other group", symptoms: [{ label: "Third", on: true, severity: 3 }] },
];
function setup(mounted: boolean) {
  const defs = { NestedFixture: definition };
  const screen: ScreenLike = { id: "test", components: [{ id: "f1", c: "NestedFixture", groups }] };
  const runtime = mounted ? createScreenController({ screen, defs }) : undefined;
  const store = runtime?.store ?? createInteractionStore();
  const agent = createAgentAccess({ defs, store, current: () => screen, ...(runtime ? { runtime } : {}) });
  return { runtime, store, agent };
}

describe.each([true, false])("nested controls with controller: %s", (mounted) => {
  it("reads seed values, labels and only actual enabled addresses", () => {
    const { runtime, agent } = setup(mounted);
    expect(agent.read()).toContain("First: on 2/5");
    expect(agent.read()).toContain('"Second"');
    expect(agent.read()).toContain("[f1/r1/symptom_2 toggle:off]");
    expect(agent.read()).toContain("[f1/r1/severity_1 set = 2]");
    expect(agent.read()).not.toContain("f1/r1/severity_2");
    expect(agent.read()).not.toContain("f1/r2/symptom_2");
    runtime?.dispose();
  });
  it("sets inclusive endpoints repeatedly and projects live nested arrays", () => {
    const { runtime, agent, store } = setup(mounted);
    for (const value of [5, 0, 3, 0, 5]) {
      expect(agent.act({ address: "test/f1/r1/severity_1", action: "set", value }).ok).toBe(true);
      expect(agent.read()).toContain(`First: on ${value}/5`);
      expect(agent.read()).toContain(`[f1/r1/severity_1 set = ${value}]`);
      expect(agent.read()).not.toContain("First: on 2/5");
      expect(store.get("test/f1/r1/severity_1")).toBe(value);
      if (runtime) {
        const live = runtime.snapshotScreen().components[0]!.groups as z.output<typeof props>["groups"];
        expect(live[0]!.symptoms[0]!.severity).toBe(value);
        expect(live[1]!.symptoms[0]!.severity).toBe(3);
      }
    }
    expect(groups[0]!.symptoms[0]!.severity).toBe(2);
    runtime?.dispose();
  });
  it("toggles conditionally, preserves severity and handles repeated changes in batches", () => {
    const { runtime, agent } = setup(mounted);
    expect(
      agent.act([
        { address: "f1/r1/symptom_2", action: "toggle" },
        { address: "f1/r1/severity_2", action: "set", value: 5 },
        { address: "f1/r1/symptom_2", action: "toggle" },
        { address: "f1/r1/symptom_2", action: "toggle" },
        { address: "f1/r1/severity_2", action: "set", value: 0 },
      ]).ok,
    ).toBe(true);
    expect(agent.read()).toContain("Second: on 0/5");
    for (const value of [false, true, false]) {
      expect(agent.act({ address: "f1/r1/symptom_2", action: "toggle", value }).ok).toBe(true);
      expect(agent.read()).toContain(`Second: ${value ? "on" : "off"} 0/5`);
      expect(agent.read().includes("[f1/r1/severity_2 set")).toBe(value);
      if (runtime) expect(runtime.actionsAt("f1/r1/severity_2")).toEqual(value ? ["set"] : []);
    }
    expect(agent.act({ address: "f1/r1/severity_2", action: "set", value: 1 })).toMatchObject({
      ok: false,
      code: "not_actionable",
    });
    runtime?.dispose();
  });
});

describe.each([true, false])("nested validation with controller: %s", (mounted) => {
  it.each([-1, 6, 2.5, "3", true, NaN, Infinity, undefined])("rejects %s atomically", (value) => {
    const { runtime, agent, store } = setup(mounted);
    const before = store.snapshot();
    expect(
      agent.act([
        { address: "f1/r1/symptom_2", action: "toggle" },
        { address: "f1/r1/severity_1", action: "set", value },
      ]),
    ).toMatchObject({ ok: false, code: "invalid_value", at: 1 });
    expect(store.snapshot()).toEqual(before);
    expect(agent.read()).toContain("Second: off 0/5");
    runtime?.dispose();
  });
  it("rolls back conditional failures, rejects absent controls and leaves dry runs untouched", () => {
    const { runtime, agent, store } = setup(mounted);
    const before = store.snapshot();
    expect(
      agent.act([
        { address: "f1/r1/symptom_1", action: "toggle" },
        { address: "f1/r1/severity_1", action: "set", value: 4 },
      ]),
    ).toMatchObject({ ok: false, code: "not_actionable", at: 1 });
    for (const address of ["f1/r1/symptom_0", "f1/r1/severity_3", "f1/r3/symptom_1"])
      expect(agent.act({ address, action: "toggle" }).ok).toBe(false);
    expect(agent.act({ address: "f1/r1/symptom_1", action: "toggle", value: 1 })).toMatchObject({
      ok: false,
      code: "invalid_value",
    });
    expect(agent.act({ address: "f1/r1/severity_1", action: "set", value: 4 }, { dryRun: true }).ok).toBe(
      true,
    );
    expect(store.snapshot()).toEqual(before);
    runtime?.dispose();
  });
});

it("gives nested declarations ownership over duplicate indexed actions and their conditions", () => {
  const meta = {
    ...definition.meta,
    actions: { items: { severity_2: ["set"], symptom_1: ["toggle"] } },
  } as Definition["meta"];
  const offered = affordancesOf(meta, stampItemIds(meta, props.parse({ groups })), "f1");
  expect(offered.filter((item) => item.address === "f1/r1/symptom_1")).toHaveLength(1);
  expect(offered.some((item) => item.address === "f1/r1/severity_2")).toBe(false);
});

it("keeps core read prompts identical because core components have no nested declaration", () => {
  for (const [, def] of selectedEntries<Definition>(components)) {
    expect(def.meta.items?.nested).toBeUndefined();
    for (const probe of def.probes) {
      if (probe.kind !== "read") continue;
      const instance = probe.expect.address.split("/")[0]!;
      const meta = { ...def.meta };
      if (meta.items) {
        const { nested: _nested, ...items } = meta.items;
        meta.items = items;
      }
      expect(readPrompt(def, probe.screen, instance, probe.task)).toBe(
        readPrompt({ ...def, meta }, probe.screen, instance, probe.task),
      );
    }
  }
});
