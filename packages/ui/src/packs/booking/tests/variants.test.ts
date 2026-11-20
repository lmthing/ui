import { expect, it } from "vitest";
import { affordancesOf, components, readComponent, stampItemIds } from "@lmthing/ui/catalog";
import { renderInstance } from "../../../../test/render";

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const briefCases = [
  ["Appointment", { hides: ["with", "place"] }, ["Sam", "Park Gate"]],
  ["Availability", { hides: ["break"] }, ["12:00"]],
  ["ServiceMenu", { hides: ["sub"] }, ["Watering and leaf care"]],
  ["StaffPicker", { hides: ["role"] }, ["Plant care"]],
  ["Waitlist", { hides: ["ahead"] }, ["2 people ahead"]],
] as const;

it.each(briefCases)("%s hides only its secondary detail without changing actions", (id, parts, hidden) => {
  const def = components[id];
  const example = def.examples[0]!;
  const full = id === "Appointment" ? { ...example, with: "Sam", place: "Park Gate" } : example;
  const brief = { ...full, detail: "brief" };
  expect(def.props.parse(full)).toMatchObject({ detail: "full" });
  expect(def.props.safeParse({ ...full, detail: "minimal" }).success).toBe(false);
  expect(def.meta.variantParts["detail.brief"]).toEqual(parts);
  const html = renderInstance(id, brief, "filled", theme);
  const reading = readComponent(def, brief, "c1").join("\n");
  const fullReading = readComponent(def, full, "c1").join("\n");
  for (const part of parts.hides) expect(html).not.toContain(`/${part}"`);
  for (const line of hidden) {
    expect(fullReading).toContain(line);
    expect(reading).not.toContain(line);
  }
  const actions = (input: unknown) =>
    affordancesOf(def.meta, stampItemIds(def.meta, def.props.parse(input)), "c1");
  expect(actions(brief)).toEqual(actions(full));
});

it("ServiceMenu keeps each service link when its photo is hidden", () => {
  const def = components.ServiceMenu;
  const input = { ...def.examples[1]!, lead: "none" };
  expect(def.meta.variantParts["lead.none"]).toEqual({ hides: ["photo"] });
  expect(renderInstance("ServiceMenu", input, "filled", theme)).not.toContain('/photo"');
  expect(readComponent(def, input, "c1").join("\n")).toContain("[c1/r1 press→time]");
});

it("keeps the ahead count when Waitlist has no joined position to show", () => {
  const input = { ahead: 2, joined: false, detail: "brief" };
  expect(renderInstance("Waitlist", input, "filled", theme)).toContain("/ahead");
  expect(readComponent(components.Waitlist, input, "c1").join("\n")).toContain("2 people ahead");
});
