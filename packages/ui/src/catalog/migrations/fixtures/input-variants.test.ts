import { expect, it } from "vitest";
import { affordancesOf, components, migrateLine, stampItemIds } from "@lmthing/ui/catalog";

it("rewrites legacy control lines at the wire boundary and does not migrate them again", () => {
  const samples = [
    {
      line: { c: "Button", id: "b1", kind: "quiet", label: "Back", goto: "back" },
      migrated: { c: "Button", id: "b1", surface: "plain", label: "Back", goto: "back" },
    },
    {
      line: { c: "Choice", id: "c1", style: "list", options: [{ title: "A" }, { title: "B" }] },
      migrated: { c: "Choice", id: "c1", surface: "plain", options: [{ title: "A" }, { title: "B" }] },
    },
  ] as const;
  for (const { line, migrated } of samples) {
    expect(migrateLine(line, { variantOnly: true })).toEqual(migrated);
    expect(migrateLine(migrated)).toBe(migrated);
    const { c, id: _id, ...props } = migrated;
    expect(components[c].props.safeParse(props).success).toBe(true);
  }
});

it.each([
  ["cards", {}, "card"],
  ["list", {}, "plain"],
  ["list", { surface: "card" }, "card"],
])("migrates saved %s options without changing their selection", (style, override, surface) => {
  const { meta, props } = components.Choice;
  const options = [{ title: "Weekly" }, { title: "Monthly" }];
  const { c, id, ...wire } = migrateLine({ c: "Choice", id: "c1", style, options, at: 1, ...override });
  expect({ c, id }).toEqual({ c: "Choice", id: "c1" });
  expect(wire).not.toHaveProperty("style");
  const parsed = stampItemIds(meta, props.parse(wire));
  expect(parsed).toMatchObject({
    surface,
    options: [
      { id: "r1", on: false },
      { id: "r2", on: true },
    ],
  });
  expect(affordancesOf(meta, parsed, "c1")).toEqual(
    affordancesOf(meta, stampItemIds(meta, props.parse({ options, at: 1 })), "c1"),
  );
});
