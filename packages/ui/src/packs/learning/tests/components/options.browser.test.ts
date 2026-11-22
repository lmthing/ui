import type { Page } from "playwright-core";
import { expect, it } from "vitest";
import { createServer } from "vite";
import { launchChrome } from "../../../../../scripts";
import { galleryConfig } from "../../../../../scripts/look";

function playback(page: Page, value?: string) {
  return page.waitForFunction(
    (reference) => document.body.dataset.playing === (reference ?? undefined),
    value ?? null,
  );
}

async function flashcard(page: Page) {
  const part = (name: string) => page.getByTestId(`home/cards/${name}`);
  await part("audio").press("Enter");
  await playback(page, "first");
  expect(await part("front").innerText()).toBe("First card");
  await part("audio").click();
  await playback(page);
  await part("audio").click();
  await part("card").click();
  await playback(page);
  expect(await part("hard").count()).toBe(0);
  expect(await part("easy").count()).toBe(0);
  await page.getByRole("button", { name: "Still learning" }).click();
  await page.getByText("Second card", { exact: true }).waitFor();
  expect(await part("audio").count()).toBe(0);
  expect(await part("audio_2").count()).toBe(0);
  await part("card").click();
  await page.getByRole("button", { name: "Know", exact: true }).click();
  await part("audio_3").click();
  await playback(page, "third");
}

async function quiz(page: Page) {
  const part = (name: string) => page.getByTestId(`home/quiz/${name}`);
  const tile = (name: string) => page.getByRole("checkbox", { name, exact: true });
  await part("audio").click();
  await playback(page, "arrange");
  expect(await part("check").getAttribute("aria-disabled")).toBe("true");
  await tile("Water").click();
  await tile("fern.").click();
  expect(await part("order_draft").innerText()).toBe("Water fern.");
  await tile("fern.").click();
  await tile("the").click();
  await tile("fern.").click();
  await part("check").click();
  await playback(page);
  expect(await part("answer").innerText()).toBe("Water the fern.");
  await part("next").click();
  await part("audio_2").click();
  await playback(page, "confirm");
}

it("uses binary recall, addressed audio, ordering and module navigation on a phone", async () => {
  const route = "/learning-options-fixture";
  const fixture = new URL("./options.fixture.tsx", import.meta.url).pathname;
  const server = await createServer({
    ...galleryConfig(0),
    plugins: [
      {
        name: "learning-options-fixture",
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
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await page.addInitScript("globalThis.process ??= { env: {} }; globalThis.__name = (fn) => fn");
      await page.goto(new URL(route, server.resolvedUrls!.local[0]).href);
      await flashcard(page);
      await quiz(page);
      await page.getByTestId("home/path/r3/root").click();
      expect(await page.locator("body").getAttribute("data-link")).toBe(null);
      const current = page.getByTestId("home/path/r2/root");
      expect(await current.getAttribute("role")).toBe("link");
      await current.click();
      await page.waitForFunction(() => document.body.dataset.link === "soil");
    } finally {
      await browser.close();
    }
  } finally {
    await server.close();
  }
}, 60_000);
