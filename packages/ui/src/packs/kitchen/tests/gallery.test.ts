import { expect, it } from "vitest";
import { createServer } from "vite";
import { components, presets, type Definition } from "@lmthing/ui/catalog";
import { galleryConfig, launchChrome } from "../../../../scripts/look";

const ids = ["Ingredients", "CookSteps", "MealPlan", "GroceryList", "Pantry", "FoodLog", "KitchenTimers"];

it("renders the kitchen overview and every draft grid on a free port", async () => {
  const server = await createServer(galleryConfig(0));
  await server.listen();
  const browser = await launchChrome();
  try {
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const base = server.resolvedUrls!.local[0]!;
    await page.goto(`${base}?pack=kitchen`);
    await page.locator('[data-testid="component_Ingredients"]').waitFor();
    expect(await page.locator('[data-testid^="component_"]').count()).toBe(7);
    expect(await page.locator('[data-testid="component_List"]').count()).toBe(0);
    const defs = components as Record<string, Definition>;
    for (const id of ids.filter((id) => defs[id]!.meta.status === "draft"))
      expect(await page.locator(`[data-testid="component_${id}"]`).innerText()).toContain("draft");
    await page.close();
    for (const id of ids) {
      const grid = await browser.newPage();
      grid.on("pageerror", (error) => errors.push(error.message));
      try {
        await grid.goto(`${base}?c=${id}`);
        await grid.getByTestId(`variants_${id}`).waitFor();
        const def = defs[id]!;
        const cells = def.examples.length + def.meta.states!.filter((state) => state !== "filled").length;
        const previews = await grid.locator('[data-testid^="preview_"]').allTextContents();
        expect(previews).toHaveLength(cells * presets.length * 2);
        if (def.meta.status === "draft") for (const text of previews) expect(text).toContain(`${id} · draft`);
      } finally {
        await grid.close();
      }
    }
    expect(errors).toEqual([]);
  } finally {
    await browser.close();
    await server.close();
  }
}, 120000);
