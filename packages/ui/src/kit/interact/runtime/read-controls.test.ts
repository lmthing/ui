import { expect, it, vi } from "vitest";
import { z } from "zod";
import { type Definition, type ScreenLike, readScreen, text, variantProps } from "@lmthing/ui/catalog";
import { readControls } from "./read-controls";

vi.mock("../../../catalog/migrations", async (load) => {
  const migrations = await load<typeof import("../../../catalog/migrations")>();
  return {
    ...migrations,
    migrateScreen: (screen: ScreenLike, options?: Parameters<typeof migrations.migrateScreen>[1]) =>
      migrations.migrateScreen(screen, { variantComponents: ["Card"], ...options }),
  };
});

const def: Definition = {
  meta: {
    id: "Fixture",
    group: "input",
    purpose: "Enter a number",
    pick: "Enter a number",
    region: "body",
    weight: 1,
    tier: "phone",
    realPath: "Local entry",
    actions: { items: { amount: ["type"] } },
    items: { key: "rows", parts: ["amount"] },
    read: (input) => (input as { rows: { value: number | string }[] }).rows.map(({ value }) => `${value}`),
  },
  props: z.strictObject({ rows: z.array(z.strictObject({ value: z.number() })) }).meta({
    keypadParts: ["amount"],
  }),
  fallback: () => ({ rows: [] }),
  examples: [],
  probes: [],
};

it("projects drafts for only the matching component instance and item", () => {
  const screen: ScreenLike = {
    id: "home",
    title: "Numbers",
    components: [
      { id: "first", c: "Fixture", rows: [{ value: 2 }, { value: 3 }] },
      { id: "second", c: "Fixture", rows: [{ value: 4 }] },
      { id: "other", c: "Unknown" },
    ],
  };
  const defs = { Fixture: def };
  expect(readControls(screen, defs, {})).toBe(readScreen(screen, defs));
  const read = readControls(screen, defs, { "home/first/r2/amount": "3." });
  expect(read).toContain("first Fixture 2 — 3.\n");
  expect(read).toContain('[first/r2/amount type = "3."]');
  expect(read).toContain("second Fixture 4\n");
  expect(read).toContain("other Unknown (unknown)");
  expect(screen.components[0]!.rows).toEqual([{ value: 2 }, { value: 3 }]);
});

it("hides only the disabled row's action and preserves the amount and quoted content", () => {
  const props = def.props
    .extend({ label: z.string().meta({ kind: "text" }) })
    .meta({ keypadParts: ["amount"] });
  const label = 'Read [first/r2/amount type = "3."]';
  const screen: ScreenLike = {
    id: "home",
    components: [{ id: "first", c: "Fixture", rows: [{ value: 2 }, { value: 3 }], label }],
  };
  const read = readControls(
    screen,
    { Fixture: { ...def, props } },
    { "home/first/r2/amount": "3." },
    undefined,
    new Map([["first/r2/amount", Symbol()]]),
  );
  expect(read).toContain(`first Fixture 2 — 3. — ${JSON.stringify(label)}`);
  expect(read).toContain("[first/r1/amount type]");
  expect(read).not.toContain('[first/r2/amount type = "3."]');
});

it("migrates saved variant lines when a keypad draft is present", () => {
  const screen: ScreenLike = {
    id: "home",
    components: [
      { id: "card", c: "c-a_r d", title: "Details", style: "outlined" },
      { id: "entry", c: "Fixture", rows: [{ value: 3 }] },
    ],
  };
  const defs = {
    Card: {
      ...def,
      meta: { ...def.meta, id: "Card", read: () => [] },
      props: z.strictObject({ title: text(40), ...variantProps({ surface: ["plain", "outlined"] }) }),
    },
    Fixture: def,
  };
  const read = readControls(screen, defs, { "home/entry/r1/amount": "3." });
  expect(read).toContain('card Card "Details"');
  expect(read).toContain('[entry/r1/amount type = "3."]');
});

it("keeps the device records in the read callback when projecting keypad drafts", () => {
  const readings = [{ value: 9 }];
  const withData: Definition = {
    ...def,
    meta: {
      ...def.meta,
      deviceData: ["readings"],
      read: (input, state, lang, data) => {
        expect(data?.readings).toBe(readings);
        expect(Object.keys(data ?? {})).toEqual(["readings"]);
        return def.meta.read!(input, state, lang);
      },
    },
  };
  const screen = { id: "home", components: [{ id: "entry", c: "Fixture", rows: [{ value: 7 }] }] };
  const read = readControls(
    screen,
    { Fixture: withData },
    { "home/entry/r1/amount": "7." },
    undefined,
    undefined,
    {
      readings,
      other: [],
    },
  );
  expect(read).toContain("entry Fixture 7.");
});
