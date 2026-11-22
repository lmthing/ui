import { afterAll, beforeAll, expect, it } from "vitest";
import type { Browser, Page } from "playwright-core";
import { createServer, type ViteDevServer } from "vite";
import { launchChrome } from "../../../../../scripts";
import { galleryConfig } from "../../../../../scripts/look";

const route = "/sessions-test";
const fixture = new URL("./Sessions.fixture.tsx", import.meta.url).pathname;
let server: ViteDevServer, browser: Browser, page: Page;

beforeAll(async () => {
  server = await createServer({
    ...galleryConfig(0),
    plugins: [
      {
        name: "sessions-test",
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
  await server.listen();
  browser = await launchChrome();
  page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.addInitScript("globalThis.process ??= { env: {} }; globalThis.__name = (fn) => fn");
  await page.goto(new URL(route, server.resolvedUrls!.local[0]).href);
}, 60_000);

afterAll(async () => {
  await browser?.close();
  await server?.close();
});

it("filters to an empty track, then bookmarks and opens the linked session separately", async () => {
  const track = page.getByRole("radiogroup", { name: "Filter by track" });
  const bookmark = page.getByTestId("home/schedule/r1/save");
  const destination = page.locator("#destination");

  await track.getByRole("radio", { name: "Demos" }).click();
  await page.getByText("No sessions in this view").waitFor();
  expect(await bookmark.count()).toBe(0);
  await track.getByRole("radio", { name: "Main stage" }).click();
  expect(await track.getByRole("radio", { name: "Main stage" }).getAttribute("aria-checked")).toBe("true");
  await bookmark.click();
  expect(await bookmark.getAttribute("aria-label")).toBe("Remove Opening keynote from my agenda");
  expect(await destination.textContent()).toBe("");
  await track.getByRole("radio", { name: "Workshops" }).click();
  expect(await bookmark.count()).toBe(0);
  await track.getByRole("radio", { name: "All tracks" }).click();
  expect(await bookmark.getAttribute("aria-label")).toBe("Remove Opening keynote from my agenda");
  await page.getByTestId("home/schedule/r1/root").click();
  expect(await destination.textContent()).toBe("keynote");
});

it("removes agenda cards and recalculates their conflict messages after each bookmark change", async () => {
  const agenda = page.getByTestId("home/agenda/root");
  const conflicts = agenda.getByText("Time conflict");
  expect(await conflicts.count()).toBe(2);
  await agenda.getByRole("button", { name: "Remove Lighting on location from my agenda" }).click();
  expect(await agenda.getByText("Lighting on location").count()).toBe(0);
  expect(await conflicts.count()).toBe(0);
  await agenda.getByRole("button", { name: "Remove Editing live from my agenda" }).click();
  await agenda.getByText("No bookmarked sessions yet").waitFor();
});
