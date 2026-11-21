import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { expect, it } from "vitest";
import { components, planAct, readScreen, themeName } from "@lmthing/ui/catalog";
import { createScreenController, KitProvider, Screen, type ScreenController } from "@lmthing/ui/kit";
import { addressedElements, config, type AddressedElement } from "../../../../../test/render";
import { Units as unitsModule } from "../..";

const thumbnail = components.Units.examples[1]!;
const renderers = { Units: unitsModule.Units };
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
    expect(textOf(parts.get("home/u1/r1/occupancy"))).toBe(label);
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
