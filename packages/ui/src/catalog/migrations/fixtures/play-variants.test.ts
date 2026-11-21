import { expect, it } from "vitest";
import { affordancesOf, components, migrateLine, stampItemIds, type Definition } from "@lmthing/ui/catalog";

const cases = [
  ["ScoreSheet", "grid", "overflow", "all", "page"],
  ["ScoreSheet", "round", "overflow", "page", "all"],
  ["TeamPicker", "columns", "arrange", "strip", "rows"],
  ["TeamPicker", "groups", "arrange", "rows", "strip"],
  ["Trivia", "card", "emphasis", "normal", "hero"],
  ["Trivia", "large", "emphasis", "hero", "normal"],
] as const;

it.each(cases)("migrates %s style %s to %s=%s", (c, style, axis, value, explicit) => {
  const def: Definition = components[c];
  const example = def.examples[0] as Record<string, unknown>;
  const legacy = { ...example, c, id: "example", state: "filled", style };
  const { c: actual, id, state, ...input } = migrateLine(legacy);
  expect({ c: actual, id, state }).toEqual({ c, id: legacy.id, state: legacy.state });
  expect(input).not.toHaveProperty("style");
  expect(def.props.safeParse({ ...example, style }).success).toBe(false);
  const expected = { ...example, [axis]: value };
  expect(input).toEqual(expected);
  const stamp = (props: unknown) => stampItemIds(def.meta, def.props.parse(props) as Record<string, unknown>);
  expect(stamp(input)).toEqual(stamp(expected));
  expect(affordancesOf(def.meta, stamp(input), legacy.id)).toEqual(
    affordancesOf(def.meta, stamp(expected), legacy.id),
  );
  expect(affordancesOf(def.meta, stamp(input), legacy.id).length).toBeGreaterThan(0);
  expect(migrateLine({ ...legacy, [axis]: explicit })).toEqual({
    ...example,
    c,
    id,
    state,
    [axis]: explicit,
  });
});
