import { expect, it } from "vitest";
import { z } from "zod";
import type { PackId } from "../meta";
import type { Definition } from "../probes";
import { registryOf } from "./index";

const definition = {
  meta: {
    id: "List",
    group: "content",
    purpose: "Things",
    pick: "Not facts",
    region: "body",
    weight: 2,
    tier: "phone",
    realPath: "A local query.",
  },
  props: z.object({}),
  examples: [],
  fallback: () => ({}),
  probes: [],
} satisfies Definition;

it("resolves exact and case/separator-insensitive ids", () => {
  const table = { ...definition, meta: { ...definition.meta, id: "Table" } };
  const registry = registryOf({ List: definition, Table: table });
  expect(registry.resolve("Table")).toBe("Table");
  expect(registry.resolve("ta-ble")).toBe("Table");
  expect(registry.get("List")).toBe(definition);
  expect(registry.schema("List")).toBe(definition.props);
});

it("leaves drafts out unless asked", () => {
  const draft = { ...definition, meta: { ...definition.meta, id: "Draft", status: "draft" as const } };
  expect(registryOf({ List: definition, Draft: draft }).ids).toEqual(["List"]);
  expect(registryOf({ List: definition, Draft: draft }, { includeDrafts: true }).ids).toEqual([
    "List",
    "Draft",
  ]);
});

const packDefs = {
  List: definition,
  Table: { ...definition, meta: { ...definition.meta, id: "Table" } },
  Slots: { ...definition, meta: { ...definition.meta, id: "Slots" } },
  ClientList: { ...definition, meta: { ...definition.meta, id: "ClientList" } },
  Draft: {
    ...definition,
    meta: { ...definition.meta, id: "Draft", status: "draft" as const },
  },
};
const membership = { Table: "data", Slots: "booking", ClientList: "customers", Draft: "data" } as const;

it.each([
  [[], "table", undefined],
  [[], "Table", undefined],
  [[], "grid", undefined],
  [["data"], "table", "Table"],
  [["data"], "ta_ble", "Table"],
  [["data"], "GRID", undefined],
  [["booking", "customers"], "Slots", "Slots"],
  [["booking", "customers"], "client_list", "ClientList"],
  [["booking"], "ClientList", undefined],
  [["data"], "preview", undefined],
] satisfies [PackId[], string, string | undefined][])(
  "scopes %j resolving %s to %s",
  (packs, name, expected) => {
    expect(registryOf(packDefs, { packs, includeDrafts: true }, membership).resolve(name)).toBe(expected);
  },
);
it.each([false, true])("filters every accessor, including drafts (%s)", (includeDrafts) => {
  const registry = registryOf(packDefs, { packs: ["data"], includeDrafts }, membership);
  expect(registry.ids).toEqual(includeDrafts ? ["List", "Table", "Draft"] : ["List"]);
  expect(registry.defs.map((def) => def.meta.id)).toEqual(registry.ids);
  expect(registry.get("Slots")).toBeUndefined();
  expect(registry.schema("Slots")).toBeUndefined();
  expect(registry.get("Table")).toBe(includeDrafts ? packDefs.Table : undefined);
  expect(registry.schema("Table")).toBe(includeDrafts ? packDefs.Table.props : undefined);
  expect(registry.resolve("Table")).toBe(includeDrafts ? "Table" : undefined);
  expect(registry.get("Draft")).toBe(includeDrafts ? packDefs.Draft : undefined);
  expect(registry.schema("Draft")).toBe(includeDrafts ? packDefs.Draft.props : undefined);
  expect(registry.resolve("Draft")).toBe(includeDrafts ? "Draft" : undefined);
});

it("keeps historical Timeline names scoped and drops repair words", () => {
  const timeline = { ...definition, meta: { ...definition.meta, id: "Timeline" } };
  const registry = registryOf({ List: definition, Timeline: timeline });
  expect(registry.resolve("daytimeline")).toBe("Timeline");
  expect(registry.resolve("Day-Timeline")).toBe("Timeline");
  expect(registry.resolve("rows")).toBeUndefined();
  expect(registryOf({ List: definition }).resolve("daytimeline")).toBeUndefined();
});
