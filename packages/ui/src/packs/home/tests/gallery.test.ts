import { expect, it } from "vitest";
import { createServer } from "vite";
import { components, presets, type Definition } from "@lmthing/ui/catalog";
import { galleryConfig, launchChrome } from "../../../../scripts/look";

const ids = ["Chores", "Rewards", "CareSchedule", "Turns", "Agenda", "BabyLog", "Devices"];

it("renders the home-only overview and every remaining draft grid on a free port", async () => {
  const server = await createServer(galleryConfig(0));
  await server.listen();
  const browser = await launchChrome();
  try {
    const errors: string[] = [];
    const page = await browser.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    const base = server.resolvedUrls!.local[0]!;
    await page.goto(`${base}?pack=home`);
    await page.getByTestId("component_Chores").waitFor();
    expect(await page.locator('[data-testid^="component_"]').count()).toBe(7);
    expect(await page.getByTestId("component_List").count()).toBe(0);
    expect(await page.getByTestId("component_Waitlist").count()).toBe(0);
    const drafts = ids.filter(
      (id) => (components as Record<string, Definition>)[id]!.meta.status === "draft",
    );
    for (const id of drafts) expect(await page.getByTestId(`component_${id}`).innerText()).toContain("draft");
    await page.close();
    for (const id of drafts) {
      const grid = await browser.newPage();
      grid.on("pageerror", (error) => errors.push(error.message));
      try {
        await grid.goto(`${base}?c=${id}`);
        await grid.getByTestId(`variants_${id}`).waitFor();
        const def = (components as Record<string, Definition>)[id]!;
        const cells = def.examples.length + def.meta.states!.filter((state) => state !== "filled").length;
        const previews = await grid.locator('[data-testid^="preview_"]').allTextContents();
        expect(previews).toHaveLength(cells * presets.length * 2);
        for (const text of previews) expect(text).toContain(`${id} · draft`);
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
