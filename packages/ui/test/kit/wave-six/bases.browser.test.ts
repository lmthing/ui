import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import type { Browser, Page } from "playwright-core";
import { createServer, type ViteDevServer } from "vite";
import { size } from "@lmthing/ui/catalog";
import { launchChrome } from "../../../scripts";
import { galleryConfig } from "../../../scripts/look";

let server: ViteDevServer, browser: Browser, page: Page;
const route = "/wave-six-kit-test";
const fixture = new URL("./bases.fixture.tsx", import.meta.url).pathname;
const errors: string[] = [];

beforeAll(async () => {
  server = await createServer({
    ...galleryConfig(0),
    plugins: [
      {
        name: "wave-six-kit-fixture",
        configureServer({ middlewares }) {
          middlewares.use(route, (_request, response) => {
            response.setHeader("Content-Type", "text/html");
            response.end(
              `<!doctype html><style>body{margin:0}</style><div id="root"></div><script type="module" src="/@fs${fixture}"></script>`,
            );
          });
        },
      },
    ],
  });
  await server.listen();
  browser = await launchChrome();
  page = await browser.newPage({ viewport: { width: 390, height: 750 }, reducedMotion: "reduce" });
  await page.addInitScript("globalThis.process ??= { env: {} }; globalThis.__name = (fn) => fn");
  page.on("pageerror", (error) => errors.push(error.message));
}, 60000);

beforeEach(async () => {
  await page.goto(new URL(route, server.resolvedUrls!.local[0]).href);
  try {
    await page.getByRole("button", { name: "7", exact: true }).waitFor({ timeout: 15000 });
  } catch (error) {
    throw new Error(`Wave 6 fixture did not mount: ${errors.join("; ")}`, { cause: error });
  }
}, 40000);

afterAll(async () => {
  await browser?.close();
  await server?.close();
});

const button = (name: string) => page.getByRole("button", { name, exact: true });

it("opens the scientific drawer, dispatches literal keypad entries once, and keeps loading slots", async () => {
  const pad = page.getByTestId("home/calc/root");
  const target = page.getByTestId("home/calc/r1/keys");
  await button("7").click();
  await button("Add").press("Enter");
  await button("Equals").press("Space");
  expect(await button("Sine").count()).toBe(0);
  await button("Scientific").click();
  expect(await button("Root").isDisabled()).toBe(true);
  await button("Sine").click();
  expect(
    (await page.locator("output").textContent())!
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line)),
  ).toEqual(
    ["7", "+", "=", "sin("].map((value) => ({ address: "home/calc/r1/keys", action: "type", value })),
  );
  const height = (await pad.boundingBox())?.height;
  await button("Disabled").click();
  expect(await button("7").isDisabled()).toBe(true);
  await button("Loading").click();
  expect(await button("7").count()).toBe(0);
  expect(await target.count()).toBe(0);
  expect((await pad.boundingBox())?.height).toBe(height);
  expect(await pad.getAttribute("aria-busy")).toBe("true");
});

it("retains full-size key targets on a 390-wide keyboard and places the required hive letter centrally", async () => {
  const board = page.getByTestId("home/letters/root");
  const keyAt = (item: string, part = "root") => page.getByTestId(`home/letters/${item}/${part}`);
  const [unused, correct, present, absent] = await Promise.all(
    ["Q", "W", "E", "R"].map((letter) =>
      button(letter).evaluate((element) => getComputedStyle(element).backgroundColor),
    ),
  );
  expect(new Set([unused, correct, present, absent]).size).toBe(4);
  expect((await keyAt("r26").boundingBox())!.width).toBe(size.control.md);
  await button("P").click();
  await button("W").press("Space");
  expect((await page.locator("output").textContent())?.trim()).toBe(
    'press home/letters/r10/root\n{"address":"home/letters/r2/type","action":"type","value":"w"}',
  );
  await button("Hive").click();
  const center = (await keyAt("r3").boundingBox())!;
  const box = (await board.boundingBox())!;
  expect(center.x + center.width / 2).toBeCloseTo(box.x + box.width / 2);
  expect(center.y + center.height / 2).toBeCloseTo(box.y + box.height / 2);
  await button("Disabled").click();
  expect(await keyAt("r3").isDisabled()).toBe(true);
  await button("Loading").click();
  expect(await keyAt("r3").count()).toBe(0);
  expect((await board.boundingBox())!.height).toBe(box.height);
});

it("renders live radial updates, caller-muted content, and inert loading at a fixed footprint", async () => {
  const orb = page.getByTestId("home/voice/orb");
  const orbRoot = page.getByTestId("home/voice/root");
  const dial = page.getByTestId("home/dial/root");
  const marker = dial.locator("circle");
  const halo = orb.locator(":scope > div").first();
  expect(await marker.count()).toBe(0);
  const idle = (await halo.boundingBox())!.width;
  const height = (await dial.boundingBox())!.height;
  const orbHeight = (await orbRoot.boundingBox())!.height;
  await button("Update level").click();
  expect((await halo.boundingBox())!.width).toBeGreaterThan(idle);
  expect(await marker.count()).toBe(1);
  const halfway = Number(await marker.getAttribute("cy"));
  await button("Update level").click();
  expect(Number(await marker.getAttribute("cy"))).toBeGreaterThan(halfway);
  await button("Think").click();
  expect(await halo.evaluate((element) => getComputedStyle(element).borderStyle)).toBe("dashed");
  expect((await halo.boundingBox())!.width).toBe(idle);
  expect(await dial.getByText("Measuring").count()).toBe(1);
  expect(await dial.locator('[aria-live="polite"]').count()).toBe(1);
  await button("Mute").click();
  expect((await halo.boundingBox())!.width).toBe(idle);
  expect(await orb.getByText("Muted").count()).toBe(1);
  await button("Resume voice").press("Enter");
  expect((await page.locator("output").textContent())?.trim()).toBe("press home/voice/orb");
  await button("Loading").click();
  expect(await orb.count()).toBe(0);
  expect(await marker.count()).toBe(0);
  expect(await dial.getByText("Measuring").count()).toBe(0);
  expect((await dial.boundingBox())!.height).toBe(height);
  expect((await orbRoot.boundingBox())!.height).toBe(orbHeight);
  expect(errors).toEqual([]);
});
