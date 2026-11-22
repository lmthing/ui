import { afterAll, beforeAll, expect, it } from "vitest";
import type { Browser, Locator, Page } from "playwright-core";
import { createServer, type ViteDevServer } from "vite";
import { launchChrome } from "../../../../../scripts";
import { galleryConfig } from "../../../../../scripts/look";

const route = "/events-polish-test";
const fixture = new URL("./events-polish.fixture.tsx", import.meta.url).pathname;
let server: ViteDevServer, browser: Browser, page: Page;

beforeAll(async () => {
  server = await createServer({
    ...galleryConfig(0),
    plugins: [
      {
        name: "events-polish-test",
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

function part(address: string) {
  return page.getByTestId(`home/${address}`);
}

function usesDangerTone(label: Locator) {
  return label.evaluate((node) => {
    const fg = getComputedStyle(node).color;
    const sample = document.createElement("span");
    node.appendChild(sample);
    sample.style.color = "var(--bad)";
    const bad = getComputedStyle(sample).color;
    sample.style.color = "var(--accent)";
    const accent = getComputedStyle(sample).color;
    sample.remove();
    return fg === bad && fg !== accent;
  });
}

it("keeps decline off the accent and marks it selected only after confirmation", async () => {
  const decline = part("reply/no");
  const selected = decline.locator("svg");
  expect(await usesDangerTone(part("reply/no_label"))).toBe(true);
  expect(await selected.count()).toBe(0);
  await decline.click();
  await part("confirm/cancel").click();
  expect(await selected.count()).toBe(0);
  await decline.click();
  await part("confirm/confirm").click();
  await selected.waitFor();
  expect(await usesDangerTone(part("reply/no_label"))).toBe(true);
  expect(await part("reply/plus").count()).toBe(0);
});

it("keeps claiming immediate and requires confirmation for the danger-styled release", async () => {
  const action = page.locator("#last-action");
  expect(await usesDangerTone(part("host/r1/unclaim_label"))).toBe(true);
  await part("gifts/r1/claim").click();
  expect(await action.textContent()).toBe("home/gifts/r1/claim");
  await part("host/r1/unclaim").click();
  await part("confirm/confirm").waitFor();
  expect(await action.textContent()).toBe("home/gifts/r1/claim");
  await part("confirm/confirm").click();
  expect(await action.textContent()).toBe("home/host/r1/unclaim");
});

function figureEnd(figure: Locator) {
  return figure.evaluate((node) => {
    const range = document.createRange();
    range.selectNodeContents(node);
    return range.getBoundingClientRect().right;
  });
}

it("aligns the actual figures in each supplier payment column", async () => {
  for (const column of ["cost", "paid", "balance"]) {
    const first = part(`vendors/r1/${column}`);
    const second = part(`vendors/r2/${column}`);
    expect(await first.textContent()).not.toBe(await second.textContent());
    expect(Math.abs((await figureEnd(first)) - (await figureEnd(second)))).toBeLessThan(1);
  }
  await part("vendors/r2/root").click();
  expect(await page.locator("#last-action").textContent()).toBe("home/vendors/r2");
});
