import { expect, it } from "vitest";
import { z } from "zod";
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
