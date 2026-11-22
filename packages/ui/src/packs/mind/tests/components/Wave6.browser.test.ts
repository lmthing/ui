import { fileURLToPath, URL } from "node:url";
import { expect, it } from "vitest";
import { createServer } from "vite";
import type { Page } from "playwright-core";
import { galleryConfig, launchChrome } from "../../../../../scripts/look";

const fixture = fileURLToPath(new URL("./Wave6.browser-fixture.tsx", import.meta.url));

async function useGrounding(page: Page) {
  const next = page.getByRole("button", { name: "Next sense" });
  for (const cue of ["four things", "three sounds", "two things", "one thing"]) {
    await next.click();
    await page.getByText(new RegExp(cue)).waitFor();
  }
  await page.getByRole("button", { name: "Finish" }).click();
  await page.getByText("Grounding complete").waitFor();
  expect(await next.count()).toBe(0);
}

async function usePresets(page: Page) {
  const rain = page.getByRole("slider", { name: "Rain volume" });
  const night = page.getByRole("radio", { name: "Night rain" });
  const volume = (value: number) => rain.and(page.locator(`[aria-valuenow="${value}"]`));
  await night.click();
  await volume(3).waitFor();
  expect(await night.getAttribute("aria-checked")).toBe("true");
  await rain.press("ArrowRight");
  await volume(4).waitFor();
  expect(await night.getAttribute("aria-checked")).toBe("false");
  await page.getByRole("radio", { name: "Day rain" }).click();
  await volume(10).waitFor();
  expect(await page.getByRole("slider", { name: "Sleep timer" }).getAttribute("aria-valuenow")).toBe("10");
}

it("uses the mind option views through mounted controls in calm light at 390 px", async () => {
  const server = await createServer({
    ...galleryConfig(0),
    plugins: [
      {
        name: "mind-options-test",
        configureServer(server) {
          server.middlewares.use("/mind-options", (_request, response) => {
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
      const url = `${server.resolvedUrls!.local[0]}mind-options`;
      await page.addInitScript("globalThis.process ??= { env: {} }");
      await page.goto(url);
      await useGrounding(page);
      await usePresets(page);
      await page.goto(`${url}?records`);
      await page.getByText("Small joys").waitFor();
      expect(await page.getByTestId("mind/e1/r1/photo").count()).toBe(0);
      await page.getByTestId("mind/e1/r1/root").click();
      expect(await page.locator("body").getAttribute("data-destination")).toBe("oct_02");
      await page.getByText("23%", { exact: true }).waitFor();
      await page.getByRole("button", { name: "Edit sleep times" }).click();
      expect(await page.locator("body").getAttribute("data-destination")).toBe("sleep_log");
    } finally {
      await browser.close();
    }
  } finally {
    await server.close();
  }
}, 45_000);
