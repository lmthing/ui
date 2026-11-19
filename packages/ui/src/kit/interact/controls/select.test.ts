import { expect, it, vi } from "vitest";
import { z } from "zod";
import {
  components,
  planAct,
  readScreen,
  type Values,
  type ActStep,
  type ScreenLike,
  type Definition,
} from "@lmthing/ui/catalog";
import { controlStep, createAgentAccess, createScreenController, selectedStep } from "../index";
function select(c: keyof typeof components, raw: Values, step: ActStep) {
  const entry = { id: "c1", c, ...raw };
  const screen: ScreenLike = { id: "test", components: [entry] };
  const input = components[c]!.props.parse(raw) as Values;
  return controlStep(
    screen,
    entry,
    input,
    components,
    {},
    selectedStep(step, entry, input, components[c]!),
    1000,
  );
}
it("selects only the addressed option by inferred index or display label", () => {
  const raw = { options: [{ title: "First" }, { title: "Second" }] };
  expect(select("Choice", raw, { address: "c1/r2", action: "select" })).toMatchObject({
    value: 1,
    values: { "test/c1/$at": 1 },
  });
  expect(select("Choice", raw, { address: "c1/r2", action: "select", value: "Second" }).value).toBe(1);
  expect(select("Choice", raw, { address: "c1/r2", action: "select", value: 0 })).toMatchObject({
    error: "Select the option at this address",
    values: {},
  });
  expect(select("Choice", raw, { address: "c1/r3", action: "select" })).toMatchObject({
    error: "No option at this address",
    values: {},
  });
});
it("updates the selected sheet position and every chip flag", () => {
  const sheet = {
    style: "picker",
    title: "Choose",
    items: ["First", "Second", "Third", "Fourth", "Fifth", "Sixth"].map((label) => ({ label })),
  };
  expect(select("Sheet", sheet, { address: "c1/r2", action: "select" }).values).toMatchObject({
    "test/c1/$at": 1,
    "test/c1/at": 1,
  });
  expect(
    select("Chips", { style: "choose", items: sheet.items }, { address: "c1/r2", action: "select" }).values,
  ).toMatchObject({
    "test/c1/r1": false,
    "test/c1/r2": true,
    "test/c1/r3": false,
    "test/c1/r4": false,
    "test/c1/r5": false,
    "test/c1/r6": false,
  });
});

const props = z.strictObject({
  mode: z.enum(["simple", "custom"]),
  modes: z.array(z.enum(["simple", "custom"])),
  amount: z.number(),
});
const fixture = {
  meta: {
    id: "ProjectionFixture",
    group: "input",
    purpose: "Choose a mode and set a quantity.",
    pick: "A controller fixture.",
    region: "body",
    weight: 1,
    tier: "phone",
    realPath: "Local preferences.",
    select: { prop: "mode", choices: { l1: { prop: "modes" } } },
    set: { quantity: { prop: "amount", min: 0, max: 8 } },
    actions: { parts: { l1: ["select"], quantity: ["set"] } },
    read: (value: unknown) => {
      const { mode, amount } = value as z.output<typeof props>;
      return [`${mode} / ${amount}`];
    },
  },
  props,
  fallback: () => ({}),
  examples: [],
  probes: [],
} satisfies Definition;

function setup(modes = ["simple", "custom"]) {
  const seed = { mode: "simple", modes, amount: 3 };
  const screen = { id: "test", components: [{ id: "p1", c: fixture.meta.id, ...seed }] };
  const defs = { [fixture.meta.id]: fixture };
  const onChange = vi.fn();
  const runtime = createScreenController({ screen, defs, requireMounted: true, onChange });
  runtime.registerPart("test/p1/l1");
  runtime.registerPart("test/p1/quantity");
  const agent = createAgentAccess({ current: () => screen, defs, store: runtime.store, runtime });
  return { runtime, agent, seed, onChange };
}
const selectStep = (value?: unknown) => ({ address: "test/p1/l1", action: "select", value });
const set = (value: unknown) => ({ address: "p1/quantity", action: "set", value });

it("keeps tap, agent read, and the projected screen in agreement across edits", () => {
  const { runtime, agent, seed, onChange } = setup();
  expect(runtime.act(selectStep("custom"))).toMatchObject({ ok: true, changed: 'p1/l1 select = "custom"' });
  expect(runtime.act(set(2.5))).toMatchObject({ ok: true });
  expect(runtime.snapshotScreen().components[0]).toMatchObject({ mode: "custom", amount: 2.5 });
  expect(agent.read()).toContain("custom / 2.5");
  expect(agent.act([selectStep("simple"), set(0)])).toMatchObject({ ok: true });
  expect(runtime.snapshotScreen().components[0]).toMatchObject({ mode: "simple", amount: 0 });
  expect(onChange.mock.lastCall?.[0].components[0]).toMatchObject({ mode: "simple", amount: 0 });
  expect(agent.read()).toContain(
    'simple / 0 [p1/l1 select = "simple"; choices ["simple","custom"]] [p1/quantity set = 0]',
  );
  expect(runtime.act(selectStep("custom"))).toMatchObject({ ok: true });
  expect(agent.read()).toContain("custom / 0");
  expect(seed).toMatchObject({ mode: "simple", amount: 3 });
});

it("rejects implicit choices, out-of-list values and invalid numbers without changing live props", () => {
  const { runtime, agent, seed, onChange } = setup(["simple"]);
  expect(runtime.act(selectStep())).toMatchObject({ ok: false, code: "invalid_value" });
  expect(agent.act(selectStep("custom"))).toMatchObject({ ok: false, code: "invalid_value" });
  expect(agent.act([set(0), set(9)])).toMatchObject({ ok: false, code: "invalid_value", at: 1 });
  expect(runtime.act(set("4"))).toMatchObject({ ok: false, code: "invalid_value" });
  expect(runtime.snapshotScreen().components[0]).toMatchObject(seed);
  expect(agent.read()).toContain("simple / 3");
  expect(onChange).not.toHaveBeenCalled();
});

it("shares live derived choices and top-level numeric values across both planners", () => {
  const derived = {
    ...fixture,
    meta: {
      ...fixture.meta,
      adjust: { "plus.increment": { prop: "amount", delta: 1 } },
      actions: { parts: { ...fixture.meta.actions.parts, plus: ["increment"], edit: ["press"] } },
    },
    props: z
      .strictObject({ mode: props.shape.mode, amount: props.shape.amount, goto: z.string() })
      .overwrite((input) => ({ ...input, modes: input.amount >= 2 ? ["simple", "custom"] : [] })),
  } satisfies Definition;
  const screen = {
    id: "test",
    components: [{ id: "p1", c: derived.meta.id, mode: "simple", amount: 0, goto: "editor" }],
  };
  const defs = { [derived.meta.id]: derived };
  const onLink = vi.fn();
  const runtime = createScreenController({ screen, defs, onLink });
  expect(runtime.actionsAt("p1/l1")).toEqual([]);
  expect(runtime.read()).not.toContain("p1/l1 select");
  const plus = { address: "p1/plus", action: "increment" };
  const steps = [plus, set(2), selectStep("custom")];
  const dry = planAct(screen, defs, {}, steps);
  expect(dry).toMatchObject({ ok: true, links: [] });
  if (!dry.ok) return;
  const read = readScreen(screen, defs, dry.values);
  const payloads = JSON.parse(read.match(/choices (\[[^\]]*\])/)![1]!);
  expect(payloads).toEqual(["simple", "custom"]);
  expect(runtime.act(steps)).toMatchObject({ ok: true });
  expect(runtime.read()).toBe(read);
  expect(runtime.snapshotScreen().components[0]).toMatchObject({ mode: "custom", amount: 2 });
  expect(runtime.act(selectStep(payloads[0]))).toMatchObject({ ok: true });
  expect(onLink).not.toHaveBeenCalled();
  expect(runtime.press("p1/edit")).toMatchObject({ ok: true });
  expect(onLink).toHaveBeenCalledExactlyOnceWith("editor", "test/p1/edit");
});
