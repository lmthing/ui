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
          return (props.splits as Values[]).map(({ id: _id, ...row }) => {
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
  expect(read).toContain('[e/r1/category select choices ["Travel"]]');
  expect(read).toContain('[e/r2/category select choices ["Supplies"]]');
  expect(read).not.toContain("e/r1/vat");
  expect(readScreen(screen, defs)).not.toContain("/category select");
  const choose = { address: "e/r2/category", action: "select", value: "Supplies" };
  expect(
    planAct(screen, defs, {}, [{ ...choose, value: "Travel" }], null, "planner", deviceData),
  ).toMatchObject({ ok: false, code: "invalid_value" });
  const controller = createScreenController({ screen, defs, deviceData });
  expect(controller.act([choose, { address: "e/r2/vat", action: "select", value: "None" }]).ok).toBe(true);
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
      [{ address: "e/r2/category", action: "select", value: "Supplies" }],
      null,
      "planner",
      deviceData,
    ),
  ).toMatchObject({ ok: false, code: "not_actionable" });
});
