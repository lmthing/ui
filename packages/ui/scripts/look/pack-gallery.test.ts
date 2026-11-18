import { expect, it } from "vitest";
import { createServer } from "vite";
import { components, packOf } from "@lmthing/ui/catalog";
import { galleryConfig, launchChrome } from "./index";

// Any pack component still without a view; none once every pack is built.
const draft = Object.keys(packOf).find(
  (id) => (components[id as keyof typeof components].meta as { status?: string }).status === "draft",
);

it("renders a pack-only overview and draft grids without a missing-view crash", async () => {
  const server = await createServer(galleryConfig(0));
  await server.listen();
  const browser = await launchChrome();
  try {
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const base = server.resolvedUrls!.local[0]!;
    await page.goto(`${base}?pack=booking`);
    await page.locator('[data-testid="component_Waitlist"]').waitFor();
    expect(await page.locator('[data-testid^="component_"]').count()).toBe(6);
    expect(await page.locator('[data-testid="component_List"]').count()).toBe(0);
    if (draft) {
      await page.goto(`${base}?c=${draft}&w=320&mode=light`);
      await page.locator("[data-look-frame]").first().waitFor();
      expect(await page.locator("[data-look-frame]").first().innerText()).toContain(`${draft} · draft`);
    }
    await page.goto(`${base}?c=Waitlist&w=320&mode=light`);
    await page.locator("[data-look-frame]").first().waitFor();
    expect(await page.locator("[data-look-frame]").first().innerText()).toContain("Your place in line");
    expect(errors).toEqual([]);
  } finally {
    await browser.close();
    await server.close();
  }
}, 60000);
