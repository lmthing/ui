import { expect, it } from "vitest";
import { z } from "zod";
import { planAct, readScreen, type Definition, type ScreenLike } from "../../../../catalog";
import { createAgentAccess, createInteractionStore, createScreenController } from "../../index";

const def: Definition = {
  meta: {
    id: "PairFixture",
    group: "input",
    purpose: "Edit two linked values.",
    pick: "Test linked controls.",
    region: "body",
    weight: 1,
    tier: "phone",
    realPath: "Edit locally.",
    parts: ["root", "left", "right", "flip"],
    states: ["filled", "loading"],
    deviceData: ["factor"],
    actions: { parts: { left: ["type"], right: ["type"], flip: ["press"] } },
    linkedEdits: {
      inputs: { left: { prop: "leftText", max: 8 }, right: { prop: "rightText", max: 8 } },
      swap: { part: "flip", sides: ["left", "right"] },
      project: (props, { edit, swapped }, data) => {
        const from = edit?.part ?? (swapped ? "right" : "left");
        const input = edit?.text ?? String(props.value);
        const factor = Number(data.factor?.[0] ?? 1);
        const other = from === (swapped ? "right" : "left") ? Number(input) * factor : Number(input) / factor;
        const derived = input.trim() && Number.isFinite(other) ? String(other) : "";
        return {
          leftText: from === "left" ? input : derived,
          rightText: from === "right" ? input : derived,
          swapped,
        };
      },
    },
    read: (props) => {
      const { leftText, rightText } = props as { leftText: string; rightText: string };
      return [`${leftText} ↔ ${rightText}`];
    },
  },
  props: z.strictObject({ value: z.number() }),
  fallback: () => ({ value: 1 }),
  examples: [],
  probes: [],
};
const defs = { [def.meta.id]: def };
const screen: ScreenLike = { id: "s", components: [{ id: "pair", c: def.meta.id, value: 3 }] };
const deviceData = { factor: [2] };
const type = (part: string, value: unknown) => ({ address: `s/pair/${part}`, action: "type", value });
const swap = { address: "s/pair/flip", action: "press" };
const stale = {
  "s/pair/left": "stale left",
  "s/pair/right/$draft": "stale draft",
  "s/pair/$type/right": "stale right",
};

function expectReading(reading: string, left: string, right: string) {
  expect(reading).toContain(`${left} ↔ ${right}`);
  expect(reading).toContain(`[pair/left type = ${JSON.stringify(left)}]`);
  expect(reading).toContain(`[pair/right type = ${JSON.stringify(right)}]`);
}

it("stages an ordered batch in one canonical slot and reads both projections", () => {
  expectReading(readScreen(screen, defs, stale, undefined, deviceData), "3", "6");
  const result = planAct(screen, defs, stale, [type("left", "4"), swap, type("left", "11."), swap]);
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.changed).toEqual([
    'pair/left type = "4"',
    "pair/flip press",
    'pair/left type = "11."',
    "pair/flip press",
  ]);
  expect(result.values).toMatchObject({ "s/pair/left": "stale left" });
  expect(Object.keys(result.values).filter((key) => !Object.hasOwn(stale, key))).toHaveLength(1);
  expectReading(readScreen(screen, defs, result.values, undefined, deviceData), "5.5", "11.");
});

it("shares the mounted controller's edit, swap and live-view projection with the reader", () => {
  const controller = createScreenController({
    screen,
    defs,
    deviceData,
    store: createInteractionStore(stale),
  });
  const live = () => controller.liveControls(def.meta, { value: 3 }, "pair");
  expect(live()).toMatchObject({ leftText: "3", rightText: "6", swapped: false });
  expect(controller.press(swap.address).ok).toBe(true);
  expect(live()).toMatchObject({ leftText: "6", rightText: "3", swapped: true });
  expect(controller.edit("s/pair/right", "7.").ok).toBe(true);
  expectReading(controller.read(), "14", "7.");
  expect(controller.edit("s/pair/right", "123456789")).toMatchObject({ ok: false, code: "invalid_value" });
  expect(controller.store.get("s/pair/right/$error")).toBeDefined();
  expectReading(controller.read(), "14", "7.");
  expect(controller.press(swap.address).ok).toBe(true);
  expect(controller.store.get("s/pair/right/$error")).toBeUndefined();
  expect(live()).toMatchObject({ leftText: "7.", rightText: "14", swapped: false });
  expect(controller.edit("s/pair/left", "").ok).toBe(true);
  expectReading(controller.read(), "", "");
  expect(controller.snapshotScreen()).toEqual(screen);
  controller.reset();
  expectReading(controller.read(), "3", "6");
});

it.each(["mounted", "standalone"])("validates and commits batches atomically (%s)", (mode) => {
  const store = createInteractionStore();
  const options = { screen, defs, store, deviceData };
  const runtime =
    mode === "mounted"
      ? createScreenController(options)
      : createAgentAccess({ ...options, current: () => screen });
  const batch = [type("right", "10"), swap, type("right", "6")];
  expect(runtime.act(batch, { dryRun: true })).toMatchObject({ ok: true, dryRun: true });
  expect(store.snapshot()).toEqual({});
  for (const value of [123, "123456789"]) {
    expect(runtime.act([...batch, type("left", value)])).toMatchObject({
      ok: false,
      at: 3,
      code: "invalid_value",
    });
    expect(store.snapshot()).toEqual({});
  }
  expect(runtime.act(batch).ok).toBe(true);
  expectReading(runtime.read(), "12", "6");
});

it("does not offer linked actions while loading", () => {
  const loading: ScreenLike = { ...screen, components: [{ ...screen.components[0]!, state: "loading" }] };
  expect(planAct(loading, defs, {}, [type("left", "4")])).toMatchObject({
    ok: false,
    code: "not_actionable",
  });
  expect(readScreen(loading, defs)).not.toContain("[pair/flip press]");
});

it.each(["mounted", "standalone"])("keeps a confirmed swap pending until acceptance (%s)", (mode) => {
  const guarded = { ...def, meta: { ...def.meta, confirmParts: ["flip"] } };
  const store = createInteractionStore();
  const options = { screen, defs: { [def.meta.id]: guarded }, store, deviceData };
  const runtime =
    mode === "mounted"
      ? createScreenController(options)
      : createAgentAccess({ ...options, current: () => screen });
  const before = runtime.read();
  expect(runtime.act(swap).ok).toBe(true);
  expect(runtime.read()).toContain("[confirm/confirm press]");
  expect(runtime.act({ address: "confirm/cancel", action: "dismiss" }).ok).toBe(true);
  expect(runtime.read().trim()).toBe(before.trim());
  expect(runtime.act(swap).ok).toBe(true);
  expect(runtime.act({ address: "confirm/confirm", action: "press" }).ok).toBe(true);
  expectReading(runtime.read(), "6", "3");
});
