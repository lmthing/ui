import { expect, it } from "vitest";
import { archetypes, components, composeFormat, createRegistry, scoreComposition } from "@lmthing/ui/catalog";

it("forces recipe-scoped component ids and required instance ids", () => {
  const format = composeFormat(archetypes.chat.meta, "thread", components);
  const branches = format.json_schema.schema.properties?.components?.items?.anyOf!;
  expect(branches.map((branch) => branch.properties?.c?.const)).toEqual(["Header", "Bubbles", "Composer"]);
  expect(branches.every((branch) => branch.required?.includes("id"))).toBe(true);
  expect(format.json_schema.schema.additionalProperties).toBe(false);
});
it("validates strict optional nulls and still rejects cross-field violations", () => {
  const meta = archetypes.chat.meta,
    screen = createRegistry().defaultLines("chat", "thread", { things: [], items: [] });
  const strict = {
    ...screen,
    title: null,
    components: screen.components.map((entry) => ({
      ...entry,
      ...(entry.c === "Header" ? { sub: null } : {}),
    })),
  };
  const result = scoreComposition(JSON.stringify(strict), meta, "thread", components);
  expect(result.issues).toEqual([]);
  expect(result.screen).not.toHaveProperty("title");
  expect(result.screen?.components[0]).not.toHaveProperty("sub");
});
