import { expect, it } from "vitest";
import { affordancesOf, components, migrateLine, stampItemIds } from "@lmthing/ui/catalog";

const line = {
  c: "Library",
  id: "saved",
  items: [{ title: "Volume one", photo: "lib:volume_one", goto: "volume_one" }],
};

it.each([
  ["grid", "grid"],
  ["list", "rows"],
  ["shelf", "strip"],
] as const)("accepts Library style %s on saved lines and migrates to arrange %s", (style, arrange) => {
  const { c, id, ...input } = migrateLine({ ...line, style });
  const { meta, props } = components.Library;
  expect({ c, id }).toEqual({ c: line.c, id: line.id });
  expect(input).not.toHaveProperty("style");
  const parsed = stampItemIds(meta, props.parse(input));
  expect(parsed).toMatchObject({ arrange, items: [{ id: "r1" }] });
  expect(affordancesOf(meta, parsed, line.id)).toEqual([
    { address: "saved/r1", action: "press", part: "root", detail: "→volume_one" },
  ]);
  expect(migrateLine({ ...line, style, arrange: "strip" })).toMatchObject({ arrange: "strip" });
});

it("keeps an omitted layout on grid and does not rewrite the loans style", () => {
  const { props } = components.Library;
  expect(migrateLine(line)).toBe(line);
  expect(props.parse({ items: line.items }).arrange).toBe("grid");
  const loans = { ...line, style: "loans" };
  expect(migrateLine(loans)).toBe(loans);
});
