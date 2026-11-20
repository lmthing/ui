import { expect, it, vi } from "vitest";
import { z } from "zod";
import { components, planAct, writerFormatFor, type Definition } from "@lmthing/ui/catalog";
import { selectDeviceData } from "./index";
import { readComponent, readScreen } from "../read";

const readings = [{ score: 4 }];
const previewDeviceData = vi.fn(() => ({ readings: [{ score: 8 }] }));
const def: Definition = {
  ...components.Header,
  meta: {
    ...components.Header.meta,
    id: "ReadingFixture",
    deviceData: ["readings", "inherited"],
    previewDeviceData,
    read: (props, _state, lang, data) => [
      `${lang}: ${Object.keys(data ?? {}).join(",")} = ${data?.readings?.length ?? 0}`,
      Object.hasOwn(props as object, "readings") ? "wire records" : "wire props only",
    ],
  },
  props: z.strictObject({}),
};

it("selects only declared own host record kinds, without copying their rows", () => {
  const data = Object.assign(Object.create({ inherited: [{}] }), { readings, private: [{}] });
  const selected = selectDeviceData(def.meta, data);
  expect(Object.keys(selected)).toEqual(["readings"]);
  expect(selected.readings).toBe(readings);
  expect(selectDeviceData(components.Header.meta, data)).toEqual({});
  expect(selectDeviceData(def.meta)).toEqual({});
});

it("keeps the Writer schema, interaction values and preview fixtures separate from host records", () => {
  const { schema } = writerFormatFor(def).json_schema;
  expect(schema).toMatchObject({
    properties: { c: { const: "ReadingFixture" } },
    additionalProperties: false,
  });
  expect(Object.keys(schema.properties ?? {})).toEqual(["c"]);
  expect(def.props.safeParse({ readings }).success).toBe(false);
  expect(def.props.safeParse({ deviceData: { readings } }).success).toBe(false);

  const defs = { ReadingFixture: def };
  const screen = { id: "home", components: [{ id: "r1", c: "ReadingFixture" }] };
  const values = { "home/r1/$deviceData": { readings } };
  expect(readScreen(screen, defs, values, "en")).toContain("en:  = 0 — wire props only");
  expect(readScreen(screen, defs, values, "en", { readings, private: [{}] })).toContain(
    "en: readings = 1 — wire props only",
  );
  expect(readComponent(def, {}, "r1", "filled", {}, "en", { readings })[0]).toContain("en: readings = 1");
  expect(previewDeviceData).not.toHaveBeenCalled();
});

it("omits gated text and actions and plans only against the supplied host records", () => {
  const action: Definition = {
    ...def,
    meta: { ...def.meta, actions: { parts: { root: ["press"] } } },
    props: z.strictObject({ goto: z.string() }),
  };
  const gated: Definition = {
    ...action,
    meta: {
      ...action.meta,
      id: "GatedFixture",
      deviceDataVisible: (data) => !!data.readings?.length && !Object.hasOwn(data, "unrelated"),
    },
  };
  const defs = { ReadingFixture: action, GatedFixture: gated };
  const input = { goto: "detail" };
  const screen = {
    id: "home",
    components: [
      { id: "g", c: "GatedFixture", ...input },
      { id: "u", c: "ReadingFixture", ...input },
    ],
  };
  const values = { "home/g/$deviceData": { readings } };
  const step = { address: "home/g/root", action: "press" };
  for (const data of [undefined, { readings: [] }, Object.create({ readings })]) {
    expect(readComponent(gated, input, "g", "filled", {}, "en", data)).toEqual([]);
    expect(readScreen(screen, defs, values, "en", data)).not.toContain("GatedFixture");
    expect(readScreen(screen, defs, values, "en", data)).toContain("[u press");
    expect(planAct(screen, defs, values, [step], null, "planner", data)).toMatchObject({
      ok: false,
      code: "not_actionable",
      at: 0,
    });
    expect(planAct(screen, defs, values, [{ ...step, address: "u" }], null, "planner", data)).toMatchObject({
      ok: true,
    });
  }
  const data = { readings, unrelated: [{}] };
  expect(readScreen(screen, defs, values, "en", data)).toContain("[g press");
  expect(planAct(screen, defs, values, [step], null, "planner", data)).toMatchObject({
    ok: true,
    links: [{ goto: "detail" }],
  });
  expect(previewDeviceData).not.toHaveBeenCalled();
});
