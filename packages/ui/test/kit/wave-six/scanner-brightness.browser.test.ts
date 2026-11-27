import { expect, it } from "vitest";
import { createServer } from "vite";
import { launchChrome } from "../../../scripts";
import { galleryConfig } from "../../../scripts/look";

const route = "/kit-scanner-brightness-test";
const view = new URL("./scanner-brightness.view.tsx", import.meta.url).pathname;

it("zooms the real PassCard by keyboard and pointer and restores it when the host disconnects", async () => {
  const server = await createServer({
    ...galleryConfig(0),
    plugins: [
      {
        name: "kit-scanner-brightness-fixture",
        configureServer({ middlewares }) {
          middlewares.use(route, (_request, response) => {
            response.setHeader("Content-Type", "text/html");
            response.end(
              `<!doctype html><div id="root"></div><script type="module" src="/@fs${view}"></script>`,
            );
          });
        },
      },
    ],
  });
  try {
    await server.listen();
    const browser = await launchChrome();
    try {
      const page = await browser.newPage({ viewport: { width: 390, height: 700 } });
      await page.addInitScript("globalThis.process ??= { env: {} }; globalThis.__name = (fn) => fn");
      await page.goto(new URL(route, server.resolvedUrls!.local[0]).href);
      const code = page.getByRole("img", { name: "Pass barcode" }).locator("svg");
      const scanner = page.getByRole("button", { name: "Scanner view" });
      expect(await scanner.getAttribute("aria-pressed")).toBe("false");
      const normal = (await code.boundingBox())!.width;
      const path = await code.locator("path").getAttribute("d");
      await scanner.focus();
      await page.keyboard.press("Enter");
      await expect.poll(() => scanner.getAttribute("aria-pressed")).toBe("true");
      expect((await code.boundingBox())!.width).toBeGreaterThan(normal);
      expect(await code.locator("path").getAttribute("d")).toBe(path);
      expect(await page.evaluate(() => window.activeBrightnessLeases())).toBe(1);
      await scanner.click();
      await expect.poll(() => scanner.getAttribute("aria-pressed")).toBe("false");
      expect((await code.boundingBox())!.width).toBe(normal);
      await scanner.click();
      await page.getByRole("button", { name: "Disconnect brightness" }).click();
      await expect.poll(() => scanner.getAttribute("aria-pressed")).toBe("false");
      expect(await page.evaluate(() => window.activeBrightnessLeases())).toBe(0);
      expect(await scanner.isDisabled()).toBe(true);
    } finally {
      await browser.close();
    }
  } finally {
    await server.close();
  }
});
