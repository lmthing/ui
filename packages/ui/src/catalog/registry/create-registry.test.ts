import { expect, it } from "vitest";
import { z } from "zod";
import { createCatalogRegistry } from "./index";

it("exact ids win over another component's alias", () => {
  const definition = {
    meta: { id: "List", group: "content", purpose: "Things", pick: "Not facts", region: "body",
      weight: 2, tier: "phone", realPath: "A local query.", aliases: ["Table"] },
    props: z.object({}), examples: [], fallback: () => ({}), probes: [],
  } as const;
  const registry = createCatalogRegistry({ List: definition, Table: {
    ...definition, meta: { ...definition.meta, id: "Table", aliases: [] },
  } });
  expect(registry.resolve("Table")).toBe("Table");
  expect(registry.get("List")).toBe(definition);
  expect(registry.schema("List")).toBe(definition.props);
});
