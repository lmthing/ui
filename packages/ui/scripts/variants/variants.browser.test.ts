import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { createServer } from "vite";
import { expect, it } from "vitest";
import { bundleChecks, capture, galleryConfig, launchChrome } from "../look";

function fixtureServer() {
  // Fixture declarations stay in the browser test until real components adopt the axes.
  return createServer({
    ...galleryConfig(0),
    plugins: [
      {
        name: "test-variant-declarations",
        transform(source, id) {
          if (!id.endsWith("/src/entry/catalog.ts")) return;
          return `${source}
          import { variantProps as fixtureVariantProps } from "../catalog";
          const choices = { emphasis: ["normal", "quiet", "hero"] };
          Object.assign(components.Card, {
            meta: { ...components.Card.meta, variants: choices, items: undefined },
            props: components.Card.props.safeExtend(fixtureVariantProps(choices))
          });
          const { variants, items, ...plain } = components.List.meta;
          components.List.meta = plain;
        `;
        },
      },
    ],
  });
}

it("renders and captures each alternative once, leaving the default sheets unchanged", async () => {
  const server = await fixtureServer();
  await server.listen();
  const browser = await launchChrome();
  const out = `${await mkdtemp(join(import.meta.dirname, ".variant-shots-"))}/`;
  try {
    const base = server.resolvedUrls!.local[0];
    const page = await browser.newPage();
    await page.goto(`${base}?c=Card`, { waitUntil: "networkidle" });
    const panel = page.getByTestId("shared_variants_Card");
    await panel.getByText("emphasis: quiet").waitFor();
    expect(await panel.getByText("emphasis: hero").count()).toBe(1);
    expect(await panel.getByText("emphasis: normal").count()).toBe(0);

    await page.goto(`${base}?c=Card&w=390&mode=dark`, { waitUntil: "networkidle" });
    await page.locator("[data-look-frame]").first().waitFor();
    expect(await page.getByText("emphasis: quiet").count()).toBe(0);
    expect(await page.locator('[data-look-frame*="_dark_"]').count()).toBeGreaterThan(2);

    const url = `${base}?c=Card&variant-sheet`;
    await page.goto(url, { waitUntil: "networkidle" });
    const frames = page.locator("[data-look-frame]");
    await frames.first().waitFor();
    expect(await page.locator("[data-look-label]").allTextContents()).toEqual([
      "emphasis: quiet",
      "emphasis: hero",
    ]);
    await expect.poll(() => frames.count()).toBe(2);
    for (const frame of await frames.all()) expect((await frame.boundingBox())?.width).toBe(390);
    expect(await page.locator(".t_kit_calm_light_moss").count()).toBeGreaterThan(0);
    await page.close();

    const content = await bundleChecks();
    await capture(browser, `${base}?c=List&variant-sheet`, out, 390, "light", content, true);
    expect(existsSync(`${out}variants.png`)).toBe(false);
    await capture(browser, url, out, 390, "light", content, true);
    expect(existsSync(`${out}variants.png`)).toBe(true);
    expect(existsSync(`${out}390-light.png`)).toBe(false);
  } finally {
    await browser.close();
    await server.close();
    await rm(out, { recursive: true, force: true });
  }
}, 120000);
