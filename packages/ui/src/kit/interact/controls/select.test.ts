import { expect, it } from "vitest";
import { components, type Values, type ActStep, type ScreenLike } from "@lmthing/ui/catalog";
import { controlStep, selectedStep } from "../index";
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
