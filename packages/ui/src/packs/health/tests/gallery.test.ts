import { expect, it } from "vitest";
import { createServer } from "vite";
import { components, packOf, presets, type Definition } from "@lmthing/ui/catalog";
import { galleryConfig, launchChrome } from "../../../../scripts/look";

const ids = Object.keys(packOf).filter((id) => packOf[id as keyof typeof packOf] === "health");

it("renders health's overview and every draft grid on the existing free-port gallery", async () => {
  const server = await createServer(galleryConfig(0));
  await server.listen();
  const browser = await launchChrome();
  const errors: string[] = [];
  const defs = components as Record<string, Definition>;
  try {
    const page = await browser.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    const base = server.resolvedUrls!.local[0]!;
    await page.goto(`${base}?pack=health`);
    await page.getByTestId("component_Workout").waitFor();
    expect(await page.locator('[data-testid^="component_"]').count()).toBe(9);
    expect(await page.getByTestId("component_List").count()).toBe(0);
    for (const id of ids)
      if (defs[id]!.meta.status === "draft")
        expect(await page.getByTestId(`component_${id}`).innerText()).toContain("draft");
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
