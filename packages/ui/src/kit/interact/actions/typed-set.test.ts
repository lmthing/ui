import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { expect, it, vi } from "vitest";
import { z } from "zod";
import { KitInput, KitProvider, Screen } from "@lmthing/ui/kit";
import { config, elementAt, type Theme } from "../../../../test/render";
import { isoDate, planAct, readScreen, themeName, type Definition } from "../../../catalog";
import { createScreenController, type ScreenController } from "../index";

const fixture = {
  meta: {
    id: "TypedSetFixture",
    group: "input",
    purpose: "Edit several kinds of values.",
    pick: "A fixture for typed setters.",
    region: "body",
    weight: 1,
    tier: "phone",
    realPath: "Local control.",
    set: {
      date: { type: "date", prop: "on", min: "2024-02-29", max: "2024-03-15" },
      root: { type: "choice", prop: "mode", choices: ["all", "some", "none"] },
      amount: { type: "number", prop: "count", min: 0, max: 5, integer: true },
      legacy: { prop: "quantity", min: 0, max: 3 },
    },
    adjust: { "plus.increment": { prop: "quantity", delta: 0.5, max: 2 } },
    actions: {
      parts: { date: ["set", "type"], root: ["set"], amount: ["set"], legacy: ["set"], plus: ["increment"] },
    },
    read: (input) => [`Current ${(input as { summary: string }).summary}`],
  },
  props: z
    .strictObject({
      on: isoDate,
      mode: z.enum(["all", "some", "none"]),
      count: z.number(),
      quantity: z.number(),
    })
    .refine(({ mode }) => mode !== "none")
    .overwrite((props) => ({
      ...props,
      summary: `${props.on} ${props.mode} ${props.count} ${props.quantity}`,
    })),
  examples: [],
  fallback: () => ({}),
  probes: [],
} satisfies Definition;

const defs = { [fixture.meta.id]: fixture };
const seed = { on: "2024-03-01", mode: "all", count: 1, quantity: 1 };
const screen = { id: "s", components: [{ id: "c1", c: fixture.meta.id, ...seed }] };
const set = (part: string, value: unknown) => ({ address: `s/c1/${part}`, action: "set", value });

function setup() {
  const onAction = vi.fn();
  const runtime = createScreenController({ defs, screen, onAction, requireMounted: true });
  for (const part of ["date", "root", "amount", "legacy", "plus"]) runtime.registerPart(`s/c1/${part}`);
  return { runtime, onAction };
}

function DateControl({ on }: { on: string }) {
  return createElement(KitInput, {
    part: "date",
    kind: "date",
    action: "set",
    projected: true,
    value: on,
    hint: "Date",
  });
}

function renderDate(controller: ScreenController) {
  const theme = { preset: "calm", mode: "light", accent: "moss" } satisfies Theme;
  const content = createElement(Screen, { controller, renderers: { [fixture.meta.id]: DateControl } });
  const host = createElement(KitProvider, { theme, controller, interactive: true, children: content });
  return renderToStaticMarkup(
    createElement(TamaguiProvider, { config, defaultTheme: themeName(theme) }, host),
  );
}

it("projects typed set values into snapshots, render props and both reads", () => {
  const { runtime, onAction } = setup();
  const steps = [
    set("date", "2024-02-29"),
    set("root", "some"),
    set("amount", 5),
    set("legacy", 1.75),
    { address: "s/c1/plus", action: "increment" },
    { address: "s/c1/date", action: "type", value: "uncommitted text" },
  ];
  const plan = planAct(screen, defs, {}, steps);
  expect(plan.ok).toBe(true);
  expect(runtime.act(steps, { dryRun: true }).ok).toBe(true);
  expect(runtime.snapshotScreen()).toEqual(screen);
  expect(onAction).not.toHaveBeenCalled();
  expect(runtime.act(steps).ok).toBe(true);
  const { id, c: _c, ...wire } = runtime.snapshotScreen().components[0]!;
  const expected = { on: "2024-02-29", mode: "some", count: 5, quantity: 2 };
  expect(wire).toEqual(expected);
  expect(runtime.liveControls(fixture.meta, fixture.props.parse(wire), id)).toMatchObject({
    ...expected,
    summary: "2024-02-29 some 5 2",
  });
  const date = elementAt(renderDate(runtime), "s/c1/date");
  expect(date.tag).toBe("input");
  expect(date.attributes).toContain('value="2024-02-29"');
  const reading = readScreen(screen, defs, plan.ok ? plan.values : {});
  expect(runtime.read()).toBe(reading);
  expect(reading).toContain("Current 2024-02-29 some 5 2");
  expect(reading).toContain('[c1/date set = "2024-02-29"]');
  expect(reading).toContain('[c1 set = "some"]');
  expect(runtime.act(set("date", "2024-03-15")).ok).toBe(true);
  expect(runtime.snapshotScreen().components[0]?.on).toBe("2024-03-15");
});

it("commits early ISO years when the destination schema permits them", () => {
  const def = {
    ...fixture,
    meta: { ...fixture.meta, set: { ...fixture.meta.set, date: { prop: "on", type: "date" } } },
    props: fixture.props.safeExtend({ on: z.iso.date() }),
  } satisfies Definition;
  const definitions = { [def.meta.id]: def };
  const step = set("date", "0004-02-29");
  const planned = planAct(screen, definitions, {}, [step]);
  expect(planned.ok).toBe(true);
  if (planned.ok) expect(readScreen(screen, definitions, planned.values)).toContain("0004-02-29");
  const runtime = createScreenController({ defs: definitions, screen });
  expect(runtime.act(step).ok).toBe(true);
  expect(runtime.snapshotScreen().components[0]?.on).toBe("0004-02-29");
});

it.each([
  ["date", "2026-02-30"],
  ["date", "2024-02-28"],
  ["date", "2024-03-16"],
  ["root", "unknown"],
  ["root", "none"], // Allowed by metadata, but forbidden by the component schema.
  ["amount", "2"],
  ["amount", 1.5],
  ["amount", 6],
  ["legacy", 3], // The numeric setter still uses the intersection with the nudge bound.
])("rejects invalid %s edits and rolls back earlier steps (%j)", (part, value) => {
  const { runtime, onAction } = setup();
  const steps = [set("date", "2024-03-15"), set(part, value)];
  const before = runtime.store.snapshot();
  const failure = { ok: false, code: "invalid_value", at: 1 };
  expect(planAct(screen, defs, {}, steps)).toMatchObject(failure);
  expect(runtime.act(steps)).toMatchObject(failure);
  expect(runtime.store.snapshot()).toEqual(before);
  expect(runtime.snapshotScreen()).toEqual(screen);
  expect(onAction).not.toHaveBeenCalled();
});
