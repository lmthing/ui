import { expect, it } from "vitest";
import { z } from "zod";
import { planAct, readScreen, text, type Definition, type Values } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { reportFixture } from "./host-projections";

const key = z.string();
const split = z.strictObject({ label: text(30), key, category: key.optional(), vat: key.optional() });
const choices = z.array(z.object({ value: key, label: text(30) }));
const authorized = z.object({ key, categories: choices, vatRates: choices });
const def: Definition = {
  ...reportFixture,
  props: z.strictObject({ splits: z.array(split) }),
  meta: {
    ...reportFixture.meta,
    id: "SplitFixture",
    deviceData: ["allowed"],
    items: {
      key: "splits",
      parts: ["root", "label", "category", "vat"],
      deviceData: {
        schema: split.extend({ categories: choices, vatRates: choices }),
        rows: (data, props) => {
          const allowed = (data.allowed ?? []).flatMap((raw) => {
            const parsed = authorized.safeParse(raw);
            return parsed.success ? [parsed.data] : [];
          });
          return [...(props.splits as Values[])].reverse().map(({ id: _id, ...row }) => {
            const match = allowed.find((record) => record.key === row.key);
            return { ...row, categories: match?.categories ?? [], vatRates: match?.vatRates ?? [] };
          });
        },
      },
      editPath: (row, wire) => {
        const index = (wire.splits as Values[]).findIndex((split) => split.key === row.key);
        return index < 0 ? undefined : ["splits", index];
      },
      edits: {
        category: { action: "select", prop: "category", choices: { row: "categories" } },
        vat: { action: "select", prop: "vat", choices: { row: "vatRates" } },
      },
    },
    actions: { items: { category: ["select"], vat: ["select"] } },
    read: () => [],
  },
};
const defs = { [def.meta.id]: def };
const splits = [
  { key: "a", label: "First split" },
  { key: "b", label: "Second split" },
];
const screen = { id: "s", components: [{ id: "e", c: def.meta.id, splits }] };
const deviceData = {
  allowed: [
    { key: "a", categories: [{ value: "travel", label: "Travel" }], vatRates: [] },
    {
      key: "b",
      categories: [{ value: "supplies", label: "Supplies" }],
      vatRates: [{ value: "nil", label: "None" }],
    },
  ],
};

it("reads, validates and writes choices against the addressed host-authorized split only", () => {
  const read = readScreen(screen, defs, {}, undefined, deviceData);
  expect(read).toContain('[e/r1/category select choices ["Supplies"]]');
  expect(read).toContain('[e/r2/category select choices ["Travel"]]');
  expect(read).not.toContain("e/r2/vat");
  expect(readScreen(screen, defs)).not.toContain("/category select");
  const choose = { address: "e/r1/category", action: "select", value: "Supplies" };
  expect(
    planAct(screen, defs, {}, [{ ...choose, value: "Travel" }], null, "planner", deviceData),
  ).toMatchObject({ ok: false, code: "invalid_value" });
  const controller = createScreenController({ screen, defs, deviceData });
  expect(controller.act([choose, { address: "e/r1/vat", action: "select", value: "None" }]).ok).toBe(true);
  expect(controller.snapshotScreen().components[0]?.splits).toEqual([
    splits[0],
    { ...splits[1], category: "supplies", vat: "nil" },
  ]);
  expect(def.props.safeParse({ splits: [{ ...splits[0], categories: ["supplies"] }] }).success).toBe(false);
});

it("never offers positional writes into the wire from a projected split", () => {
  const { editPath: _editPath, ...items } = def.meta.items!;
  const unmapped = { [def.meta.id]: { ...def, meta: { ...def.meta, items } } };
  expect(readScreen(screen, unmapped, {}, undefined, deviceData)).not.toContain("/category select");
  expect(
    planAct(
      screen,
      unmapped,
      {},
      [{ address: "e/r1/category", action: "select", value: "Supplies" }],
      null,
      "planner",
      deviceData,
    ),
  ).toMatchObject({ ok: false, code: "not_actionable" });
});

it("reads host-only splits but only offers edits for splits with a wire owner", () => {
  const items = def.meta.items!;
  const projection = items.deviceData!;
  const mixed = {
    ...def,
    meta: {
      ...def.meta,
      items: {
        ...items,
        deviceData: {
          ...projection,
          rows: (...args: Parameters<typeof projection.rows>) => [
            ...projection.rows(...args),
            {
              key: "host",
              label: "Host-only split",
              categories: [{ value: "other", label: "Other" }],
              vatRates: [],
            },
          ],
        },
      },
    },
  };
  const mixedDefs = { [def.meta.id]: mixed };
  const read = readScreen(screen, mixedDefs, {}, undefined, deviceData);
  const steps = [{ address: "e/r3/category", action: "select", value: "Other" }];
  expect(read).toContain('r3 "Host-only split"');
  expect(read).toContain('[e/r1/category select choices ["Supplies"]]');
  expect.soft(read).not.toContain("e/r3/category select");
  const controller = createScreenController({ screen, defs: mixedDefs, deviceData });
  expect(controller.actionsAt("e/r1/category")).toContain("select");
  expect.soft(controller.actionsAt("e/r3/category")).toEqual([]);
  expect(planAct(screen, mixedDefs, {}, steps, null, "planner", deviceData)).toMatchObject({
    ok: false,
    code: "not_actionable",
  });
});

it("does not authorize a row-local choice from the Wire without a host row projection", () => {
  const { deviceData: _deviceData, editPath: _editPath, ...items } = def.meta.items!;
  const writerDef = {
    ...def,
    props: z.strictObject({ splits: z.array(split.extend({ categories: choices })) }),
    meta: { ...def.meta, items },
  };
  const writerDefs = { [def.meta.id]: writerDef };
  const writerScreen = {
    id: "s",
    components: [
      {
        id: "e",
        c: def.meta.id,
        splits: [{ ...splits[0], categories: [{ value: "travel", label: "Travel" }] }],
      },
    ],
  };
  const steps = [{ address: "e/r1/category", action: "select", value: "Travel" }];
  expect(writerDef.props.safeParse({ splits: writerScreen.components[0]!.splits }).success).toBe(true);
  expect.soft(readScreen(writerScreen, writerDefs)).not.toContain("e/r1/category select");
  expect(planAct(writerScreen, writerDefs, {}, steps, null)).toMatchObject({
    ok: false,
    code: "not_actionable",
  });
});
