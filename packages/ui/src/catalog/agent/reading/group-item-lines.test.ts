import { expect, it } from "vitest";
import { z } from "zod";
import { planAct, readComponent, text, type Definition } from "@lmthing/ui/catalog";

const def = {
  meta: {
    id: "GroupedFixture",
    group: "data",
    purpose: "Read related entries.",
    pick: "Read related entries.",
    region: "body",
    weight: 1,
    tier: "phone",
    realPath: "Entries on the device.",
    items: { key: "rows", parts: ["root"], prefix: "e", readGroupBy: "group" },
    actions: { parts: { root: ["press"] }, items: { root: ["press"] } },
  },
  props: z.strictObject({
    rows: z.array(
      z.strictObject({ name: text(30), group: text(30).nullable().optional(), goto: z.string() }),
    ),
  }),
  fallback: () => ({ rows: [] }),
  examples: [],
  probes: [],
} satisfies Definition;
const seed = {
  rows: [
    { name: "First", group: 'A "team"', goto: "first" },
    { name: "Solo", goto: "solo" },
    { name: "Second", group: 'A "team"', goto: "second" },
    { name: "Solo", goto: "another" },
    { name: "Other", group: "Solo", goto: "other" },
  ],
};

it("prints one compact line per named group with every original link and leaves unnamed entries separate", () => {
  expect(readComponent(def, seed, "c")).toEqual([
    "c GroupedFixture [c press]",
    `  ${JSON.stringify('A "team"')}: e1 "First" [c/e1 press→first]; e3 "Second" [c/e3 press→second]`,
    '  e2 "Solo" [c/e2 press→solo]',
    '  e4 "Solo" [c/e4 press→another]',
    '  "Solo": e5 "Other" [c/e5 press→other]',
  ]);
  const screen = { id: "home", components: [{ id: "c", c: def.meta.id, ...seed }] };
  expect(
    planAct(screen, { GroupedFixture: def }, {}, [{ address: "home/c/e3", action: "press" }]),
  ).toMatchObject({
    ok: true,
    links: [{ goto: "second", address: "home/c/e3" }],
  });
});

it("does not group on secrets or print their values", () => {
  const hiddenGroup = z.string().meta({ kind: "secret" });
  const props = z.strictObject({
    rows: z.array(z.strictObject({ name: text(30), group: hiddenGroup.optional(), goto: z.string() })),
  });
  const reading = readComponent({ ...def, props }, seed, "c");
  expect(reading).toHaveLength(6);
  expect(reading.join("\n")).not.toContain("team");
  expect(reading[1]).toContain("(secret)");
});

it("groups host-only rows from their projection schema without a Writer collection", () => {
  const host = {
    ...def,
    props: z.strictObject({}),
    meta: {
      ...def.meta,
      deviceData: ["entries"],
      items: {
        ...def.meta.items,
        deviceData: {
          rows: (data) => data.entries ?? [],
          schema: def.props.shape.rows.element,
        },
      },
    },
  } satisfies Definition;
  const lines = readComponent(host, {}, "c", "filled", {}, undefined, { entries: seed.rows });
  expect(lines).toEqual(readComponent(def, seed, "c"));
});

it.each([
  ["inner", z.string().meta({ kind: "secret" }).nullable()],
  ["outer", text(30).nullable().meta({ kind: "secret" })],
])("does not expose secrets tagged on a nullable field's %s schema", (_label, group) => {
  const props = z.strictObject({
    rows: z.array(z.strictObject({ name: text(30), group: group.optional(), goto: z.string() })),
  });
  const reading = readComponent({ ...def, props }, seed, "c");
  expect(reading).toHaveLength(6);
  expect(reading.join("\n")).not.toContain("team");
});
