import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { expect, it } from "vitest";
import { components, planAct, readScreen, themeName } from "@lmthing/ui/catalog";
import {
  createScreenController,
  KitProvider,
  renderers,
  Screen,
  type ScreenController,
} from "@lmthing/ui/kit";
import { addressedElements, config, type AddressedElement } from "../../../../../test/render";

const thumbnail = components.Units.examples[1]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;

function textOf(part?: AddressedElement): string {
  return part ? [...part.text, ...part.children.map(textOf)].join("") : "";
}

function drawLive(controller: ScreenController) {
  return renderToStaticMarkup(
    createElement(
      TamaguiProvider,
      { config, defaultTheme: themeName(theme) },
      createElement(KitProvider, {
        theme,
        controller,
        interactive: true,
        children: createElement(Screen, { controller, renderers }),
      }),
    ),
  );
}

it("projects date edits into the addressed field, rows and both readers, rejecting invalid dates", () => {
  const defs = { Units: components.Units };
  const screen = { id: "home", components: [{ id: "u1", c: "Units", ...thumbnail }] };
  const controller = createScreenController({ screen, defs, currency: "GBP", requireMounted: false });
  const set = (value: unknown) => ({ address: "home/u1/date", action: "set", value });
  for (const [date, label, occupant] of [
    ["2026-11-18", "reserved", undefined],
    ["2026-11-19", "occupied", "Lee"],
    ["2026-11-21", "vacant", undefined],
  ] as const) {
    const plan = planAct(screen, defs, {}, [set(date)]);
    expect(plan.ok).toBe(true);
    expect(controller.act(set(date)).ok).toBe(true);
    expect(controller.snapshotScreen().components[0]?.on).toBe(date);
    const parts = addressedElements(drawLive(controller));
    expect(parts.get("home/u1/date")?.attributes).toContain(`value="${date}"`);
    expect(textOf(parts.get("home/u1/r1/occupancy"))).toBe(label[0]!.toUpperCase() + label.slice(1));
    expect(parts.get("home/u1/r1/occupant")?.text?.[0]).toBe(occupant);
    expect(parts.get("home/u1/r1/rent")?.text?.[0]).toBe(occupant ? "£85 / night" : undefined);
    const reading = readScreen(screen, defs, plan.ok ? plan.values : {}, undefined, undefined, "GBP");
    expect(controller.read()).toBe(reading);
    expect(reading).toContain(`North Cabin · ${label}${occupant ? " · Lee · £85 / night" : ""}`);
    expect(reading).toContain(`[u1/date set = "${date}"]`);
  }
  const before = controller.snapshotScreen();
  const invalid = set("2026-02-30");
  expect(planAct(screen, defs, {}, [invalid])).toMatchObject({ ok: false, code: "invalid_value" });
  expect(controller.act(invalid)).toMatchObject({ ok: false, code: "invalid_value" });
  expect(controller.snapshotScreen()).toEqual(before);
  controller.dispose();
});

it("filters vacancies on the live date and never renumbers or offers a hidden row", () => {
  const { units, lets, on } = components.Units.examples[0]!;
  const notice = { ...lets[0]!, end: "2026-12-01", noticeGivenOn: "2026-11-24" };
  const stay = {
    letRef: "cedar_stay",
    unitRef: "flat_b",
    occupant: "Lee",
    kind: "stay",
    start: "2026-11-19",
    end: "2026-11-23",
    rent: 85,
    per: "night",
  };
  const defs = { Units: components.Units };
  const screen = {
    id: "home",
    components: [
      {
        c: "Units",
        id: "u1",
        style: "vacancies",
        on,
        units,
        lets: [notice, stay],
      },
    ],
  };
  const controller = createScreenController({ screen, defs });
  const open = { address: "u1/r1", action: "press" };
  for (const [date, willow, cedar] of [
    ["2026-11-18", undefined, undefined],
    ["2026-11-20", undefined, undefined],
    ["2026-11-23", undefined, "Vacant"],
    ["2026-11-24", "Notice given", "Vacant"],
    ["2026-12-01", "Vacant", "Vacant"],
    ["2026-11-19", undefined, undefined],
  ] as const) {
    const set = { address: "u1/date", action: "set", value: date };
    expect(controller.act(set).ok).toBe(true);
    const html = drawLive(controller);
    const parts = addressedElements(html);
    expect(parts.has("home/u1/r1/root")).toBe(Boolean(willow));
    expect(parts.has("home/u1/r2/root")).toBe(Boolean(cedar));
    expect(textOf(parts.get("home/u1/r1/occupancy"))).toBe(willow ?? "");
    expect(textOf(parts.get("home/u1/r2/occupancy"))).toBe(cedar ?? "");
    expect(controller.read().includes("Willow Flat")).toBe(Boolean(willow));
    expect(controller.read().includes("r2 · Cedar Flat")).toBe(Boolean(cedar));
    expect(html.includes("No vacant units")).toBe(!willow && !cedar);
    expect(planAct(screen, defs, {}, [set, open]).ok).toBe(Boolean(willow));
  }
  expect(controller.act(open).ok).toBe(false);
  expect(controller.snapshotScreen().components[0]?.units).toEqual(units);
  controller.dispose();
});

it("does not infer notice from an end date or count notice from a cancelled let", () => {
  const { props, examples } = components.Units;
  const example = examples[2]!;
  const notice = example.lets[0]!;
  for (const patch of [
    { end: undefined },
    { noticeGivenOn: notice.end },
    { noticeGivenOn: "2026-02-30" },
    { kind: "stay", per: "night" },
  ])
    expect(props.safeParse({ ...example, lets: [{ ...notice, ...patch }] }).success).toBe(false);

  for (const [change, shouldShow] of [
    [{ noticeGivenOn: undefined }, false],
    [{ cancelled: true }, true],
  ] as const) {
    const screen = {
      id: "home",
      components: [{ ...example, c: "Units", id: "u1", lets: [{ ...notice, ...change }] }],
    };
    const reading = readScreen(screen, components);
    expect(reading.includes("r1 · Willow Flat · Vacant")).toBe(shouldShow);
    expect(reading).not.toContain("Notice given");
  }
});
