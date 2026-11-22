import type { Page } from "playwright-core";
import { expect, it } from "vitest";
import { createServer } from "vite";
import { launchChrome } from "../../../../scripts";
import { galleryConfig } from "../../../../scripts/look";

async function exerciseGradebook(page: Page) {
  const category = page.getByTestId("home/grades/r1/root");
  const coursework = page.getByTestId("home/grades/r1/item_1");
  await category.waitFor();
  expect(await category.getAttribute("aria-expanded")).toBe("true");
  await category.click();
  await coursework.waitFor({ state: "detached" });
  expect(await category.getAttribute("aria-expanded")).toBe("false");
  await page.getByTestId("home/grades/r2/root").click();
  await page.getByText("Light and humidity").waitFor();
  await category.click();
  await coursework.click();
  await page.waitForFunction(() => document.body.dataset.link === "fern_plan");
}

async function exerciseWorkedSolution(page: Page) {
  const next = page.getByRole("button", { name: "Next step" });
  const all = page.getByRole("button", { name: "Show all steps" });
  const answer = page.getByTestId("home/solution/answer");
  expect(await answer.count()).toBe(0);
  await page.getByTestId("home/solution/r1/copy").click();
  await page.waitForFunction(() => document.body.dataset.copied === "60 ÷ 2 = 30 mL per cup");
  await next.click();
  await page.getByText("2. Scale to five cups").waitFor();
  expect(await answer.count()).toBe(0);
  await all.click();
  await answer.waitFor();
  expect(await answer.innerText()).toBe("150 mL");
  expect(await next.count()).toBe(0);
  await page.getByRole("button", { name: "Copy answer" }).click();
  await page.waitForFunction(() => document.body.dataset.copied === "150 mL");
  await page.getByRole("link", { name: "Ask a tutor" }).click();
  await page.waitForFunction(() => document.body.dataset.link === "ratio_help");
}

it("uses both learning components in a real calm-light phone screen", async () => {
  const route = "/learning-flow-fixture";
  const fixture = new URL("./learning-flow.fixture.tsx", import.meta.url).pathname;
  const server = await createServer({
    ...galleryConfig(0),
    plugins: [
      {
        name: "learning-flow-fixture",
        configureServer({ middlewares }) {
          middlewares.use(route, (_request, response) => {
            response.setHeader("Content-Type", "text/html");
            response.end(
              `<!doctype html><div id="root"></div><script type="module" src="/@fs${fixture}"></script>`,
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
      await page.addInitScript(`
        globalThis.process ??= { env: {} };
        globalThis.__name = (fn) => fn;
        Object.defineProperty(navigator, "clipboard", {
          value: { writeText: async (text) => { document.body.dataset.copied = text; } }
        });
      `);
      await page.goto(new URL(route, server.resolvedUrls!.local[0]).href);
      await exerciseGradebook(page);
      await exerciseWorkedSolution(page);
    } finally {
      await browser.close();
    }
  } finally {
    await server.close();
  }
}, 60000);
