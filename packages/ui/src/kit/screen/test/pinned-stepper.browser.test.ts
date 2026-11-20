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
const setFixture = (name: string, detail?: boolean | string[]) =>
  page.evaluate(({ name, detail }) => window.dispatchEvent(new CustomEvent(name, { detail })), {
    name,
    detail,
  });

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
  expect(await part("d1/r1/trail").getAttribute("aria-label")).toBe("First row");
  expect(errors).toEqual([]);
});

it("uses one mounted part per row from both touch targets and agent actions", async () => {
  const first = part("d1/r1/qty"),
    second = part("d2/r1/qty");
  const minus = first.getByRole("button", { name: `${less}, First row`, exact: true });
  const plus = first.getByRole("button", { name: `${more}, First row`, exact: true });
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
  // The fixture's preview max is 2; the controller's declared max is 3 for both paths.
  expect(await plus.getAttribute("aria-disabled")).toBeNull();
  const result = await page.evaluate(() =>
    window.__lmthingUI!.act({ address: "d1/r1/qty", action: "increment" }),
  );
  expect(result.ok).toBe(true);
  await first.locator('[data-step-action="increment"][aria-disabled="true"]').waitFor();
  expect(await first.textContent()).toBe("3");
  expect(await plus.getAttribute("aria-disabled")).toBe("true");
  await minus.click();
  expect(await first.textContent()).toBe("2");
  expect(await second.textContent()).toBe("3");
  expect(errors).toEqual([]);
});

it("gates both human and agent directions when disabled, and re-enables them", async () => {
  const first = part("d1/r1/qty");
  const plus = first.getByRole("button", { name: more });
  await plus.click();
  await setFixture("fixture-disabled", true);
  await first.locator('[data-step-action="increment"][aria-disabled="true"]').waitFor();
  const reading = await page.evaluate(() => window.__lmthingUI!.read());
  for (const action of ["increment", "decrement"]) {
    expect(reading).not.toContain(`[d1/r1/qty ${action}]`);
    const button = first.locator(`[data-step-action="${action}"]`);
    expect(await button.getAttribute("aria-disabled")).toBe("true");
    await button.dispatchEvent("click");
    const result = await page.evaluate(
      (action) => window.__lmthingUI!.act({ address: "d1/r1/qty", action }),
      action,
    );
    expect(result).toMatchObject({ ok: false, code: "disabled" });
  }
  expect(await first.textContent()).toBe("2");
  await setFixture("fixture-disabled", false);
  await first.locator('[data-step-action="increment"]:not([aria-disabled])').waitFor();
  const enabledReading = await page.evaluate(() => window.__lmthingUI!.read());
  expect(enabledReading).toContain("[d1/r1/qty increment]");
  expect(enabledReading).toContain("[d1/r1/qty decrement]");
  await plus.click();
  expect(await first.textContent()).toBe("3");
  expect(errors).toEqual([]);
});

it("unmounts conditional pins and restores their place in the bottom region", async () => {
  const footer = part("b1/root");
  const initial = await footer.boundingBox();
  await part("d1/hide").click();
  await part("d1/r1/qty").waitFor({ state: "detached" });
  expect(await part("d2/r1/qty").count()).toBe(1);
  expect(await footer.boundingBox()).toEqual(initial);
  const result = await page.evaluate(() =>
    window.__lmthingUI!.act({ address: "d1/r1/qty", action: "increment" }),
  );
  expect(result).toMatchObject({ ok: false, code: "not_mounted" });
  await setFixture("fixture-show");
  await part("d1/r1/qty").waitFor();
  expect((await part("d1/r1/qty").boundingBox())!.y).toBeLessThan((await part("d2/r1/qty").boundingBox())!.y);
  expect(errors).toEqual([]);
});

it("orders pins by the live body and drops controls when their source starts exiting", async () => {
  const first = part("d1/r1/qty");
  const second = part("d2/r1/qty");
  await setFixture("fixture-order", ["d2", "d1"]);
  await page.waitForFunction(
    () =>
      document.querySelector('[data-testid$="/qty"]')?.getAttribute("data-testid") === "fixture/d2/r1/qty",
  );
  expect((await second.boundingBox())!.y).toBeLessThan((await first.boundingBox())!.y);
  const exiting = await page.evaluate(async () => {
    window.dispatchEvent(new CustomEvent("fixture-order", { detail: ["d2"] }));
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return {
      detailExiting: !!document
        .querySelector('[data-testid="fixture/d1/detail"]')
        ?.closest('[aria-hidden="true"]'),
      qtyMounted: !!document.querySelector('[data-testid="fixture/d1/r1/qty"]'),
    };
  });
  expect(exiting).toEqual({ detailExiting: true, qtyMounted: false });
  expect(await second.count()).toBe(1);
  expect(errors).toEqual([]);
});

it("follows the supplied order for keyed pins within one body entry", async () => {
  const first = part("d1/r1/qty");
  const second = part("d1/r2/qty");
  expect((await first.boundingBox())!.y).toBeLessThan((await second.boundingBox())!.y);
  await setFixture("fixture-row-order");
  await page.waitForFunction(
    () =>
      document
        .querySelector('[data-testid^="fixture/d1/"][data-testid$="/qty"]')
        ?.getAttribute("data-testid") === "fixture/d1/r2/qty",
  );
  expect((await second.boundingBox())!.y).toBeLessThan((await first.boundingBox())!.y);
  expect(await first.textContent()).toBe("1");
  expect(await second.textContent()).toBe("2");
  expect(errors).toEqual([]);
});

it("can call a pinned action directly from onReady", async () => {
  expect(await page.locator("html").getAttribute("data-pinned-ready")).toBe("ready");
});

it("gives the same step direction distinct accessible names in different rows", async () => {
  for (const [row, name] of [
    ["r1", "First row"],
    ["r2", "Second row"],
  ] as const) {
    const button = part(`d1/${row}/qty`).getByRole("button", { name: `${more}, ${name}`, exact: true });
    expect(await button.count()).toBe(1);
  }
});
