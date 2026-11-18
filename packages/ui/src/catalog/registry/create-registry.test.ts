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
    aliases: ["Table"],
  },
  props: z.object({}),
  examples: [],
  fallback: () => ({}),
  probes: [],
} satisfies Definition;

it("exact ids win over another component's alias", () => {
  const table = { ...definition, meta: { ...definition.meta, id: "Table", aliases: [] } };
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
  Table: { ...definition, meta: { ...definition.meta, id: "Table", aliases: ["grid", "rows"] } },
  Slots: { ...definition, meta: { ...definition.meta, id: "Slots", aliases: ["times"] } },
  ClientList: { ...definition, meta: { ...definition.meta, id: "ClientList", aliases: ["clients"] } },
  Draft: {
    ...definition,
    meta: { ...definition.meta, id: "Draft", aliases: ["preview"], status: "draft" as const },
  },
};
const membership = { Table: "data", Slots: "booking", ClientList: "customers", Draft: "data" } as const;

it.each([
  [[], "table", "List"],
  [[], "Table", "List"],
  [[], "grid", undefined],
  [["data"], "table", "Table"],
  [["data"], "ta_ble", "Table"],
  [["data"], "GRID", "Table"],
  [["booking", "customers"], "Slots", "Slots"],
  [["booking", "customers"], "clients", "ClientList"],
  [["booking"], "ClientList", undefined],
  [["data"], "preview", undefined],
] satisfies [PackId[], string, string | undefined][])(
  "scopes %j resolving %s to %s",
  (packs, name, expected) => {
    expect(registryOf(packDefs, { packs }, membership).resolve(name)).toBe(expected);
  },
);
it("pack aliases beat core aliases regardless of definition order", () => {
  const core = { ...definition, meta: { ...definition.meta, aliases: ["grid"] } };
  for (const defs of [
    { List: core, Table: packDefs.Table },
    { Table: packDefs.Table, List: core },
  ]) {
    expect(registryOf(defs, { packs: ["data"] }, membership).resolve("grid")).toBe("Table");
  }
});
it.each([false, true])("filters every accessor, including drafts (%s)", (includeDrafts) => {
  const registry = registryOf(packDefs, { packs: ["data"], includeDrafts }, membership);
  expect(registry.ids).toEqual(includeDrafts ? ["List", "Table", "Draft"] : ["List", "Table"]);
  expect(registry.defs.map((def) => def.meta.id)).toEqual(registry.ids);
  expect(registry.get("Slots")).toBeUndefined();
  expect(registry.schema("Slots")).toBeUndefined();
  expect(registry.get("Draft")).toBe(includeDrafts ? packDefs.Draft : undefined);
  expect(registry.schema("Draft")).toBe(includeDrafts ? packDefs.Draft.props : undefined);
  expect(registry.resolve("Draft")).toBe(includeDrafts ? "Draft" : undefined);
});
