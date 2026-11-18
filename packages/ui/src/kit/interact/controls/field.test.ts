import { expect, it } from "vitest";
import { components, type Values, type ActStep, type ScreenLike } from "@lmthing/ui/catalog";
import { controlStep } from "../index";
function field(input: Values, step: ActStep) {
  const entry = { id: "c1", c: "Field", label: "Value", ...input };
  const screen: ScreenLike = { id: "test", components: [entry] };
  const { id: _id, c: _c, ...raw } = entry;
  return controlStep(screen, entry, components.Field!.props.parse(raw) as Values, components, {}, step, 1000);
}
it.each([
  ["date", "2026-02-30", "Use a real date in YYYY-MM-DD"],
  ["time", "25:00", "Use a time in HH:MM"],
])("rejects an invalid %s without changing values", (kind, value, error) => {
  expect(field({ kind }, { address: "c1/field", action: "type", value })).toMatchObject({
    values: {},
    error,
  });
});
it("normalises repeat labels and rejects unavailable options", () => {
  expect(field({ kind: "repeat" }, { address: "c1/field", action: "select", value: "Weekly" })).toMatchObject(
    { values: { "test/c1/field": "weekly" }, value: "weekly" },
  );
  expect(
    field({ kind: "repeat" }, { address: "c1/field", action: "select", value: "Unavailable" }),
  ).toMatchObject({
    values: {},
    error: "Choose an available field option",
  });
});
it("clears fields, toggles their value and returns a photo address without storing one", () => {
  expect(
    field({ value: "Old" }, { address: "c1/field", action: "type", value: "" }).values["test/c1/field"],
  ).toBe("");
  expect(field({ kind: "toggle", value: "on" }, { address: "c1/field", action: "toggle" }).value).toBe("off");
  expect(field({ kind: "photo" }, { address: "c1/field", action: "press" })).toEqual({
    values: {},
    requestPhoto: "test/c1/field",
  });
});
