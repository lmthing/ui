import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import type { Browser, Page } from "playwright-core";
import { createServer, type ViteDevServer } from "vite";
import { component, size, space } from "@lmthing/ui/catalog";
import { launchChrome } from "../../../scripts";
import { galleryConfig } from "../../../scripts/look";

let server: ViteDevServer, browser: Browser, page: Page;
const route = "/kit-meter-plot-test";
const fixture = new URL("./meter-plot.fixture.tsx", import.meta.url).pathname;

beforeAll(async () => {
  server = await createServer({
    ...galleryConfig(0),
    plugins: [
      {
        name: "kit-meter-plot-fixture",
        configureServer({ middlewares }) {
          middlewares.use(route, (_request, response) => {
            response.setHeader("Content-Type", "text/html");
            response.end(
              `<!doctype html><meta name="viewport" content="width=device-width"><body style="margin:0"><div id="root"></div><script type="module" src="/@fs${fixture}"></script></body>`,
            );
          });
        },
      },
    ],
  });
  await server.listen();
  browser = await launchChrome();
  page = await browser.newPage({ viewport: { width: 390, height: 700 } });
  await page.addInitScript("globalThis.process ??= { env: {} }; globalThis.__name = (fn) => fn");
}, 60_000);

beforeEach(async () => {
  const errors: string[] = [];
  const onError = (error: Error) => errors.push(error.message);
  page.on("pageerror", onError);
  try {
    await page.goto(new URL(route, server.resolvedUrls!.local[0]).href);
    await page.getByRole("button", { name: "Toggle loading" }).waitFor({ timeout: 20_000 });
  } catch (error) {
    throw new Error(`Meter and plot fixture did not mount: ${errors.join("; ")}`, { cause: error });
  } finally {
    page.off("pageerror", onError);
  }
}, 35_000);

afterAll(async () => {
  await browser?.close();
  await server?.close();
});

const plot = () => page.getByTestId("test/plot/root");
const provider = () => plot().locator("xpath=..");
const dot = (index: number) => plot().locator("circle").nth(index);
const registered = (address: string) =>
  page.evaluate((key) => window.meterPlotParts().find((entry) => entry.address === key)?.rect, address);
const selection = (address: string, index: number) => ({
  address: address.replace(/\/root$/, ""),
  action: "select",
  value: `r${index + 1}`,
});

it("mirrors the end fill against the default meter in both writing directions", async () => {
  for (const dir of ["ltr", "rtl"]) {
    for (const [anchor, end] of [
      ["default", false],
      ["end", true],
    ] as const) {
      const track = page.getByTestId(`${dir}-${anchor}`).locator("[aria-hidden=true]");
      const box = (await track.boundingBox())!;
      const fill = (await track.locator(":scope > div").boundingBox())!;
      expect(fill.width).toBeCloseTo(box.width * 0.3);
      const isRight = (dir === "ltr") === end;
      expect(fill.x - box.x).toBeCloseTo(isRight ? box.width - fill.width : 0);
    }
  }
});

it("registers the drawn marker centres and selects them directly by pointer and keyboard", async () => {
  const svg = plot().locator("svg").first();
  const baseline = svg.locator(`line[stroke-width="${component.base.strongBorder}"]`).first();
  expect(Number(await baseline.getAttribute("y1"))).toBe(Number(await svg.getAttribute("height")) / 2);
  const samples = [
    ["test/plot/first", "0:00, 55", 0],
    ["test/plot/r2/root", "4:00, 56", 1],
    ["test/plot/r6/root", "90:00, 80", 5],
  ] as const;
  const origin = (await provider().boundingBox())!;
  for (const [address, name, index] of samples) {
    const target = page.getByRole("button", { name, exact: true });
    expect(await target.getAttribute("data-testid")).toBe(address);
    expect(await target.getAttribute("aria-pressed")).toBe(index === 1 ? "true" : "false");
    const marker = (await dot(index).boundingBox())!;
    const box = (await target.boundingBox())!;
    const x = marker.x + marker.width / 2,
      y = marker.y + marker.height / 2;
    expect(marker.width).toBe(space.xs * 2);
    expect(box).toMatchObject({ width: size.control.md, height: size.control.md });
    expect(box.x + box.width / 2).toBeCloseTo(x, 1);
    expect(box.y + box.height / 2).toBeCloseTo(y, 1);
    await expect
      .poll(() => registered(address))
      .toMatchObject({
        x: box.x - origin.x,
        y: box.y - origin.y,
        width: box.width,
        height: box.height,
      });
    await page.mouse.click(x, y);
    await expect
      .poll(() => page.evaluate(() => window.meterPlotEvents.at(-1)))
      .toEqual(selection(address, index));
    expect(await target.evaluate((node) => node === document.activeElement)).toBe(true);
    if (index === 0) await page.keyboard.press("Enter");
    if (index === 1) await page.keyboard.press("Space");
  }
  expect(await plot().getByRole("button").count()).toBe(samples.length);
  await page.keyboard.press("Shift+Tab");
  expect(
    await page.getByRole("button", { name: "4:00, 56" }).evaluate((node) => node === document.activeElement),
  ).toBe(true);
  expect(await page.evaluate(() => window.meterPlotEvents)).toEqual(
    samples.flatMap(([address, , index]) =>
      Array.from({ length: index === 5 ? 1 : 2 }, () => selection(address, index)),
    ),
  );
});

it("updates the registered position when a marker moves and removes its controls during loading", async () => {
  const address = "test/plot/first";
  const target = page.getByTestId(address);
  const before = (await target.boundingBox())!;
  const origin = (await provider().boundingBox())!;
  await page.getByRole("button", { name: "Move first marker" }).click();
  expect(await target.getAttribute("aria-label")).toBe("0:00, 70");
  expect(await target.getAttribute("aria-pressed")).toBe("true");
  const after = (await target.boundingBox())!;
  expect(after.y).toBeLessThan(before.y);
  await expect.poll(async () => (await registered(address))?.y).toBe(after.y - origin.y);
  const drawing = await dot(0).boundingBox();
  await page.getByRole("button", { name: "Toggle loading" }).click();
  expect(await plot().getAttribute("aria-busy")).toBe("true");
  expect(await target.count()).toBe(0);
  expect(await plot().getByRole("button").count()).toBe(0);
  await expect.poll(() => registered(address)).toBeUndefined();
  expect(await dot(0).boundingBox()).toEqual(drawing);
  await page.getByRole("button", { name: "Toggle loading" }).click();
  await expect.poll(async () => (await registered(address))?.y).toBe(after.y - origin.y);
});
