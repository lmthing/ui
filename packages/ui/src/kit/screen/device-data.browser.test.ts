import { fileURLToPath, URL } from "node:url";
import { expect, it } from "vitest";
import { createServer } from "vite";
import type { Page } from "playwright-core";
import { galleryConfig, launchChrome } from "../../../scripts/look";

const fixture = fileURLToPath(new URL("./device-data-fixture.tsx", import.meta.url));

function press(page: Page, address: string, dryRun = true) {
  return page.evaluate(
    ({ address, dryRun }) => window.__lmthingUI!.act({ address, action: "press" }, { dryRun }),
    { address, dryRun },
  );
}

it("reads the committed host records while a newer phone render is suspended", async () => {
  const config = galleryConfig(0);
  const server = await createServer({
    ...config,
    plugins: [
      ...(config.plugins ?? []),
      {
        name: "device-data-browser-test",
        configureServer(server) {
          server.middlewares.use("/device-data-test", (_request, response) => {
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
      const page = await browser.newPage();
      await page.addInitScript("globalThis.process ??= { env: {} };");
      await page.goto(`${server.resolvedUrls!.local[0]}device-data-test`);
      const view = page.getByTestId("home/c1/root");
      await view.filter({ hasText: "Before" }).waitFor();
      await page.waitForFunction(() => Boolean(window.__lmthingUI));
      const agent = await page.evaluateHandle(() => window.__lmthingUI);
      await page.getByRole("button", { name: "Update snapshot" }).click();
      await page.waitForFunction(() => document.body.dataset.attempted === "true");
      expect(await view.innerText()).toBe("Before");
      expect(await page.evaluate(() => window.__lmthingUI!.read())).toContain("Fixture Before");
      expect(await page.getByTestId("home/c2/root").isVisible()).toBe(true);
      expect(await press(page, "c2")).toMatchObject({ ok: true });
      expect(await press(page, "c2", false)).toMatchObject({ ok: true });
      await page.getByTestId("home/confirm/confirm").waitFor();

      await page.getByRole("button", { name: "Finish rendering" }).click();
      await view.filter({ hasText: "After" }).waitFor();
      expect(await page.getByTestId("home/c2/root").count()).toBe(0);
      expect(await press(page, "c2")).toMatchObject({ ok: false, code: "not_actionable" });
      expect(await press(page, "c3")).toMatchObject({ ok: true });
      expect(await page.getByTestId("home/confirm/confirm").count()).toBe(0);
      expect(await page.evaluate(() => window.__lmthingUI!.read())).toContain("Fixture After");
      expect(await page.evaluate(() => document.body.dataset.layoutRead)).toContain("Fixture After");
      expect(await page.evaluate(() => document.body.dataset.layoutRead)).not.toContain("GatedFixture");
      expect(await page.evaluate((previous) => window.__lmthingUI === previous, agent)).toBe(true);
      await page.getByRole("button", { name: "Restore snapshot" }).click();
      const reopened = page.getByTestId("home/c2/root");
      await reopened.waitFor();
      expect(await page.getByTestId("home/confirm/confirm").count()).toBe(0);
      await reopened.click({ timeout: 3000 });
      await page.getByTestId("home/confirm/confirm").waitFor({ timeout: 3000 });
    } finally {
      await browser.close();
    }
  } finally {
    await server.close();
  }
});
