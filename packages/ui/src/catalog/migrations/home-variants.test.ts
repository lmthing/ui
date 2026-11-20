import { expect, it } from "vitest";
import { affordancesOf, components, migrateLine, readComponent, stampItemIds } from "@lmthing/ui/catalog";

it("migrates saved Devices tiles and preserves ids, scene confirmation and explicit grouping", () => {
  const def = components.Devices;
  const input = def.examples[1]!;
  const legacy = { ...input, c: "Devices", id: "d1", state: "filled", style: "tiles" } as const;
  expect(def.props.safeParse({ ...input, style: "tiles" }).success).toBe(false);
  const { c, id, state, ...migrated } = migrateLine(legacy);
  expect({ c, id, state }).toEqual({ c: "Devices", id: "d1", state: "filled" });
  expect(migrated).not.toHaveProperty("style");
  expect(migrated).toMatchObject({ group: "sections", rooms: input.rooms, scenes: input.scenes });
  const stamped = (value: unknown) => stampItemIds(def.meta, def.props.parse(value));
  expect(stamped(migrated)).toEqual(stamped(input));
  expect(affordancesOf(def.meta, stamped(migrated), "d1")).toContainEqual(
    expect.objectContaining({ address: "d1/r8/secure", action: "press" }),
  );
  expect(readComponent(def, migrated, "d1")).toEqual(readComponent(def, input, "d1"));
  expect(migrateLine({ ...legacy, group: "none" })).toMatchObject({ group: "none" });
  expect(migrateLine({ c: "Devices", ...def.examples[0] })).toMatchObject({ style: "focused" });
});
