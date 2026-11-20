import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import type { Browser, Page } from "playwright-core";
import { createServer, type ViteDevServer } from "vite";
import { launchChrome } from "../../../../scripts";
import { galleryConfig } from "../../../../scripts/look";
import { size, wordsFor } from "../../../catalog";

let server: ViteDevServer, browser: Browser, page: Page;
const errors: string[] = [];
const { less, more } = wordsFor().stepLabels;

beforeAll(async () => {
  server = await createServer({ ...galleryConfig(0), root: new URL(".", import.meta.url).pathname });
  await server.listen();
  browser = await launchChrome();
  page = await browser.newPage({ viewport: { width: 320, height: 660 } });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript("globalThis.__name = (fn) => fn;");
}, 60000);
beforeEach(async () => {
  errors.length = 0;
  await page.goto(`${server.resolvedUrls!.local[0]}pinned-stepper.html`, { waitUntil: "networkidle" });
  expect(errors).toEqual([]);
  await page.waitForFunction(() => Boolean(window.__lmthingUI));
  await part("d1/r1/qty").waitFor();
}, 30000);
afterAll(async () => {
  await browser?.close();
  await server?.close();
});

const part = (address: string) => page.getByTestId(`fixture/${address}`);

it("pins action bars below the scrolling body and above the regular safe-area footer", async () => {
  const first = part("d1/detail");
  const last = part("d1/last");
  const qty = part("d1/r1/qty");
  const footer = part("b1/root");
  const initial = (await qty.boundingBox())!;
  const bottom = (await footer.boundingBox())!;
  expect(initial.x).toBeGreaterThanOrEqual(28);
  expect(initial.y + initial.height).toBeLessThan(bottom.y);
  expect(660 - bottom.y - bottom.height).toBeGreaterThanOrEqual(32);
  expect(await last.evaluate((detail) => detail.getBoundingClientRect().top)).toBeGreaterThan(660);
  await last.scrollIntoViewIfNeeded();
  expect((await first.boundingBox())!.y).toBeLessThan(0);
  expect((await last.boundingBox())!.y).toBeLessThan(initial.y);
  expect(await qty.boundingBox()).toEqual(initial);
  expect(await footer.boundingBox()).toEqual(bottom);
  expect(errors).toEqual([]);
});

it("uses one mounted part per row from both touch targets and agent actions", async () => {
  const first = part("d1/r1/qty"),
    second = part("d1/r2/qty");
  const minus = first.getByRole("button", { name: less, exact: true });
  const plus = first.getByRole("button", { name: more, exact: true });
  expect(await first.count()).toBe(1);
  expect(await minus.getAttribute("aria-disabled")).toBe("true");
  expect(await minus.getAttribute("tabindex")).toBe("-1");
  for (const target of [minus, plus]) {
    const box = (await target.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(size.control.md);
    expect(box.height).toBeGreaterThanOrEqual(size.control.md);
  }
  await plus.press("Enter");
  expect(await first.textContent()).toBe("2");
  const result = await page.evaluate(() =>
    window.__lmthingUI!.act({ address: "d1/r1/qty", action: "increment" }),
  );
  expect(result.ok).toBe(true);
  await page.waitForFunction(() =>
    document
      .querySelector('[data-testid="fixture/d1/r1/qty"] [aria-disabled="true"]')
      ?.matches(":last-child"),
  );
  expect(await first.textContent()).toBe("3");
  expect(await plus.getAttribute("aria-disabled")).toBe("true");
  await minus.click();
  expect(await first.textContent()).toBe("2");
  expect(await second.textContent()).toBe("3");
  expect(errors).toEqual([]);
});

it("unmounts conditional pins without disturbing the existing bottom region", async () => {
  const footer = part("b1/root");
  const initial = await footer.boundingBox();
  await part("d1/hide").click();
  await part("d1/r1/qty").waitFor({ state: "detached" });
  expect(await part("d1/r2/qty").count()).toBe(0);
  expect(await footer.boundingBox()).toEqual(initial);
  const result = await page.evaluate(() =>
    window.__lmthingUI!.act({ address: "d1/r1/qty", action: "increment" }),
  );
  expect(result).toMatchObject({ ok: false, code: "not_mounted" });
  expect(errors).toEqual([]);
});
