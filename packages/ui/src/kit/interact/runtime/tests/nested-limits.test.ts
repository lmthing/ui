import { expect, it, vi } from "vitest";
import { z } from "zod";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { config } from "../../../../../test/render";
import {
  planAct,
  readScreen,
  themeName,
  type ActStep,
  type Definition,
  type ScreenLike,
} from "../../../../catalog";
import { KitProvider } from "../../../provider";
import { PartScope } from "../../../part";
import { createScreenController, useNestedControls } from "../../index";

const nested = {
  key: "choices",
  activeParent: true,
  maxActive: 3,
  parts: { pick: { action: "toggle", prop: "on" } },
} as const;
const fixture = {
  meta: {
    id: "NestedFixture",
    group: "input",
    purpose: "Pick related choices.",
    pick: "A fixture for nested policies.",
    region: "body",
    weight: 1,
    tier: "phone",
    realPath: "Local preferences.",
    items: { key: "rows", parts: ["root", "pick_1", "pick_2", "pick_3"], nested },
    select: { prop: "parent", value: "index" },
    actions: { items: { root: ["select"], pick_1: ["toggle"], pick_2: ["toggle"], pick_3: ["toggle"] } },
  },
  props: z
    .strictObject({
      rows: z.array(z.strictObject({ labels: z.array(z.string()) })),
      seed: z.array(z.string()),
    })
    .overwrite((input) => ({
      ...input,
      rows: input.rows.map((row) => ({
        ...row,
        choices: row.labels.map((label) => ({ on: input.seed.includes(label) })),
      })),
    })),
  fallback: () => ({}),
  examples: [],
  probes: [],
} satisfies Definition;
const defs = { NestedFixture: fixture };
const screen: ScreenLike = {
  id: "home",
  components: [
    {
      c: fixture.meta.id,
      id: "picker",
      rows: [{ labels: ["A", "B", "C"] }, { labels: ["D", "E"] }],
      seed: ["A", "B"],
    },
  ],
};
const toggle = (row: number, at: number, value?: unknown) => ({
  address: `picker/r${row}/pick_${at}`,
  action: "toggle",
  value,
});
const select = (row: number) => ({ address: `picker/r${row}`, action: "select" });
const plan = (...steps: ActStep[]) => planAct(screen, defs, {}, steps);

it("plans against each staged parent and counts initial and live toggles across all rows", () => {
  expect(plan(toggle(2, 1))).toMatchObject({ code: "not_actionable", at: 0 });
  expect(plan(select(2), toggle(2, 3))).toMatchObject({ code: "not_actionable", at: 1 });
  expect(plan(toggle(1, 3), select(2), toggle(2, 1))).toMatchObject({ code: "max_active", at: 2 });
  expect(plan(toggle(1, 3), select(2), toggle(2, 1, true))).toMatchObject({ code: "max_active", at: 2 });
  expect(plan(toggle(1, 3), select(2), toggle(2, 1, "false"))).toMatchObject({
    code: "invalid_value",
    at: 2,
  });
  const result = plan(toggle(1, 3), toggle(1, 1, true), toggle(1, 2), select(2), toggle(2, 1));
  if (!result.ok) throw new Error(result.code);
  expect(result.values).toMatchObject({
    "home/picker/r1/pick_1": true,
    "home/picker/r1/pick_2": false,
    "home/picker/r2/pick_1": true,
  });
  const read = readScreen(screen, defs, result.values);
  expect(read).toContain("remaining 0");
  expect(read).toContain("[picker/r2/pick_1 toggle:on]");
  expect(read).not.toMatch(/\/r1\/pick|\/r2\/pick_2/);
  expect(planAct(screen, defs, result.values, [toggle(2, 1, false)])).toMatchObject({ ok: true });
});

it("keeps mounted action access and reading aligned, without putting derived state on the wire", () => {
  const onAction = vi.fn();
  const runtime = createScreenController({ screen, defs, requireMounted: true, onAction });
  runtime.registerPart("picker/r1/pick_3");
  runtime.registerPart("picker/r2");
  expect(runtime.actionsAt(toggle(2, 1).address)).toEqual([]);
  expect(runtime.act(toggle(1, 2))).toMatchObject({ code: "not_mounted" });
  expect(runtime.read()).toContain("remaining 1");
  const before = runtime.store.snapshot();
  expect(runtime.act([toggle(1, 3), select(2), toggle(2, 1)])).toMatchObject({ code: "max_active", at: 2 });
  expect(runtime.store.snapshot()).toEqual(before);
  expect(onAction).not.toHaveBeenCalled();
  expect(runtime.act([select(2), toggle(2, 1)], { dryRun: true }).ok).toBe(true);
  expect(runtime.store.snapshot()).toEqual(before);
  expect(runtime.act([select(2), toggle(2, 1)]).ok).toBe(true);
  expect(runtime.snapshotScreen()).toEqual(screen);
  expect(runtime.read()).toContain("[picker/r2/pick_1 toggle:on]");
  expect(runtime.actionsAt(toggle(2, 2).address)).toEqual([]);
  expect(runtime.press(toggle(2, 2).address)).toMatchObject({ code: "max_active" });
  runtime.registerPart(toggle(2, 1).address);
  expect(runtime.press(toggle(2, 1).address).ok).toBe(true);
  expect(runtime.read()).toContain("remaining 1");
  expect(runtime.actionsAt(toggle(2, 2).address)).toEqual(["toggle"]);
  runtime.reset();
  expect(runtime.read()).toContain("[picker/r1/pick_1 toggle:on]");
  runtime.dispose();
});

it("preserves legacy behavior and honors independent policy declarations", () => {
  const { activeParent: _activeParent, maxActive: _maxActive, ...legacy } = nested;
  for (const policy of [legacy, { ...legacy, maxActive: 3 }, { ...legacy, activeParent: true as const }]) {
    const def = { ...fixture, meta: { ...fixture.meta, items: { ...fixture.meta.items, nested: policy } } };
    const registry = { NestedFixture: def };
    expect(planAct(screen, registry, {}, [toggle(1, 3), select(2), toggle(2, 1)])).toMatchObject(
      "maxActive" in policy ? { code: "max_active", at: 2 } : { ok: true },
    );
    const read = readScreen(screen, registry);
    expect(read.includes("[picker/r2/pick_1 toggle:off]")).toBe(!("activeParent" in policy));
    expect(read.includes("remaining")).toBe("maxActive" in policy);
  }
});

function NestedView({ input }: { input: Record<string, unknown> }) {
  const { parent, controls } = useNestedControls(fixture.meta, input);
  return createElement(
    "section",
    { "data-parent": parent },
    controls.map(({ target, disabled }) =>
      createElement("input", { key: target, "data-testid": target, type: "checkbox", disabled }),
    ),
  );
}

it("renders only the active parent's controls, disabling only new activations at the cap", () => {
  const runtime = createScreenController({ screen, defs });
  const { c: _c, id: component, ...wire } = screen.components[0]!;
  const input = fixture.props.parse(wire);
  const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
  const view = () =>
    renderToStaticMarkup(
      createElement(TamaguiProvider, {
        config,
        defaultTheme: themeName(theme),
        children: createElement(KitProvider, {
          theme,
          controller: runtime,
          children: createElement(PartScope, {
            screen: screen.id,
            component,
            rev: 1,
            state: "filled",
            children: createElement(NestedView, { input }),
          }),
        }),
      }),
    );
  expect(view()).toContain('data-parent="r1"');
  expect(view()).not.toContain("r2/pick");
  expect(runtime.act([select(2), toggle(2, 1)]).ok).toBe(true);
  expect(view()).toContain('data-parent="r2"');
  expect(view()).not.toContain("r1/pick");
  expect(view()).toMatch(/data-testid="r2\/pick_2"[^>]*disabled=""/);
  expect(view()).not.toMatch(/data-testid="r2\/pick_1"[^>]*disabled=""/);
  runtime.dispose();
});
