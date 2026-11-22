import { fileURLToPath, URL } from "node:url";
import { expect, it } from "vitest";
import type { Locator, Page } from "playwright-core";
import { createServer } from "vite";
import { galleryConfig, launchChrome } from "../../../scripts/look";

const fixture = fileURLToPath(new URL("./controls.fixture.tsx", import.meta.url));

async function checkWipeRecovery(page: Page, wipe: Locator) {
  await expect.poll(() => wipe.isEnabled()).toBe(true);
  const toggle = page.getByRole("button", { name: "Toggle wipe lock" });
  await toggle.click();
  expect(await wipe.isEnabled()).toBe(false);
  await toggle.click();
  await expect.poll(() => wipe.isEnabled()).toBe(true);
}

it("refreshes declared ranges on mounted controls, snaps human edits, and focuses a local anchor", async () => {
  const server = await createServer({
    ...galleryConfig(0),
    plugins: [
      {
        name: "runtime-controls-browser-test",
        configureServer(server) {
          server.middlewares.use("/runtime-controls", (_request, response) => {
            response.setHeader("Content-Type", "text/html");
            response.end(`<body><script type="module" src="/@fs${fixture}"></script></body>`);
          });
        },
      },
    ],
  });
  try {
    await server.listen();
    const browser = await launchChrome();
    try {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.addInitScript("globalThis.process ??= { env: {} }; globalThis.__name ??= (fn) => fn");
      await page.goto(`${server.resolvedUrls!.local[0]}runtime-controls`);
      const slider = page.getByRole("slider", { name: "Amount slider" });
      const input = page.getByRole("spinbutton", { name: "Amount", exact: true });
      await slider.waitFor({ timeout: 10000 }).catch((error: Error) => {
        throw new Error(errors.join("\n") || error.message);
      });
      await page.getByRole("button", { name: "Go to note" }).click();
      expect(
        await page.getByRole("textbox", { name: "Note" }).evaluate((node) => node === document.activeElement),
      ).toBe(true);
      await slider.press("End");
      expect(await input.inputValue()).toBe("0.3");
      expect(await input.getAttribute("aria-valuemax")).toBe("0.3");
      const wipe = page.getByRole("slider", { name: "Wipe slider" });
      expect(await wipe.isEnabled()).toBe(false);
      await page.getByRole("button", { name: "Raise cap" }).click();
      expect(await slider.getAttribute("aria-valuemax")).toBe("0.5");
      await checkWipeRecovery(page, wipe);
      await input.fill("0.46");
      expect(await slider.getAttribute("aria-valuenow")).toBe("0.5");
      const wholeInput = page.getByRole("spinbutton", { name: "Whole amount" });
      const wholeSlider = page.getByRole("slider", { name: "Whole slider" });
      await wholeSlider.press("End");
      expect(await wholeInput.inputValue()).toBe("4");
      expect(await wholeInput.getAttribute("aria-valuemin")).toBe("1");
      await wholeInput.fill("2.6");
      expect(await wholeSlider.getAttribute("aria-valuenow")).toBe("3");
    } finally {
      await browser.close();
    }
  } finally {
    await server.close();
  }
});
