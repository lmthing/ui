import { expect, it, vi } from "vitest";
import { z } from "zod";
import {
  archetypes,
  components,
  createRegistry,
  itemVariantProps,
  scoreComposition,
  text,
  type ScreenLike,
  variantProps,
} from "@lmthing/ui/catalog";

vi.mock("../../migrations", async (load) => {
  const migrations = await load<typeof import("../../migrations")>();
  return {
    ...migrations,
    migrateScreen: (screen: ScreenLike, caller?: Parameters<typeof migrations.migrateScreen>[1]) =>
      migrations.migrateScreen(
        screen,
        screen.id === "legacy_settings" ? { ...caller, variantComponents: ["List"] } : caller,
      ),
  };
});

it("checks a legacy List toggle recipe against the migrated wire props", () => {
  const variants = { trail: ["chevron", "toggle"] } as const;
  const itemAxes = { trail: ["chevron", "toggle"] } as const;
  const defs = {
    ...components,
    List: {
      ...components.List,
      meta: {
        ...components.List.meta,
        variants,
        items: { ...components.List.meta.items, variants: itemAxes },
      },
      props: z.strictObject({
        ...variantProps(variants),
        rows: z.array(
          z.strictObject({ title: text(28), ...itemVariantProps(itemAxes, { inheritTrail: true }) }),
        ),
      }),
    },
  };
  const screen = createRegistry().defaultLines("settings", "simple", { things: [], items: [] });
  const legacy = {
    ...screen,
    id: "legacy_settings",
    components: screen.components.map((entry) =>
      entry.c !== "List"
        ? entry
        : {
            id: entry.id,
            c: "List",
            style: "inset",
            rows: [{ title: "Alerts", trail: "toggle" }],
          },
    ),
  };
  const result = scoreComposition(JSON.stringify(legacy), archetypes.settings.meta, "simple", defs);
  expect(result.issues).toEqual([]);
  const line = result.screen?.components.find((entry) => entry.c === "List");
  expect(line).not.toHaveProperty("surface");
  expect(line).not.toHaveProperty("style");
});
