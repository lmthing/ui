import { expect, it } from "vitest";
import { archetypes, components, composeFormat, createRegistry, scoreComposition } from "@lmthing/ui/catalog";

it("forces recipe-scoped component ids and required instance ids", () => {
  const format = composeFormat(archetypes.chat.meta, "thread", components);
  const branches = format.json_schema.schema.properties?.components?.items?.anyOf!;
  expect(branches.map((branch) => branch.properties?.c?.const)).toEqual(["Header", "Bubbles", "Composer"]);
  expect(branches.every((branch) => branch.required?.includes("id"))).toBe(true);
  expect(format.json_schema.schema.additionalProperties).toBe(false);
});

it("keeps the bar label limit and legacy ring label capacity in generic progress slots", () => {
  const meta = {
    id: "goals",
    purpose: "Show a target",
    layouts: { overview: { slots: [{ id: "target", allow: ["Progress"], min: 1, max: 1 }] } },
    defaults: { overview: [{ c: "Progress" }] },
  };
  const format = composeFormat(meta, "overview", components).json_schema.schema;
  const [bars, ring] = format.properties?.components?.items?.anyOf ?? [];
  expect(bars?.properties?.style).toEqual({
    anyOf: [{ type: "string", enum: ["bars"] }, { type: "null" }],
  });
  expect(ring?.properties?.style).toMatchObject({ enum: ["ring"] });
  expect(ring?.properties?.bars).toMatchObject({ minItems: 1, maxItems: 1 });
  expect(bars?.properties?.bars?.items?.properties?.label?.maxLength).toBe(20);
  expect(ring?.properties?.bars?.items?.properties?.label?.maxLength).toBe(24);
  for (const branch of [bars, ring]) {
    expect(branch?.properties?.c?.const).toBe("Progress");
    expect(branch?.required).toContain("id");
  }
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
