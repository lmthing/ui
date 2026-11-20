import { expect, it, vi } from "vitest";
import { z } from "zod";
import { components, writerFormatFor, type Definition } from "@lmthing/ui/catalog";
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
