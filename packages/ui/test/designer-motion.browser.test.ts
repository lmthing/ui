import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import type { Browser, Page } from "playwright-core";
import { createServer, type ViteDevServer } from "vite";
import { galleryConfig } from "../scripts/look";
import { launchChrome } from "../scripts";
import { baselineMotionKit, contactSheet, sampleMotionFrames } from "./motion-evidence";

const baseline = process.env.UI_MOTION_BASELINE === "1";
const changed = it.runIf(!baseline && !process.env.UI_MOTION_EVIDENCE && !process.env.UI_MOTION_PERF);
let server: ViteDevServer, browser: Browser, page: Page;
const errors: string[] = [];
beforeAll(async () => {
  server = await createServer({ ...galleryConfig(0), plugins: baseline ? [baselineMotionKit()] : [] });
  await server.listen();
  browser = await launchChrome();
  page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.setDefaultTimeout(5000);
  page.on("pageerror", (error) => errors.push(error.message));
}, 60000);
afterAll(async () => {
  await browser?.close();
  await server?.close();
});
beforeEach(async () => {
  errors.length = 0;
  await openLab();
});

async function openLab(motion: "no-preference" | "reduce" = "no-preference") {
  await page.emulateMedia({ reducedMotion: motion });
  await page.goto(`${server.resolvedUrls!.local[0]}?motion-lab=lively`);
  await page
    .getByText("My garden")
    .waitFor()
    .catch((cause) => {
      throw new Error(`The motion gallery did not render: ${errors.join("; ")}`, { cause });
    });
  await page.waitForFunction(() => Boolean(window.__lmthingUI));
}

const part = (address: string) => page.getByTestId(address);
const tap = (address: string) => part(address).click({ force: true });
const styleOf = (address: string, property: "transform" | "opacity") =>
  part(address).evaluate((node, name) => getComputedStyle(node)[name], property);

async function transforms(address: string) {
  return part(address).evaluate((node) =>
    node.getAnimations().flatMap((animation) => {
      const effect = animation.effect as KeyframeEffect;
      return effect.getKeyframes().map((frame) => frame.transform);
    }),
  );
}

changed("connects a matching row to its header, shows a rising dialog, and returns back", async () => {
  await tap("garden/plants/r1/root");
  await part("fern/heading/title").waitFor();
  expect((await transforms("fern/heading/title")).some((value) => String(value).includes("translate("))).toBe(
    true,
  );
  await tap("fern/heading/action");
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  expect(await dialog.evaluate((node) => getComputedStyle(node).transform)).not.toBe("none");
  await page.keyboard.press("Escape");
  await expect.poll(() => dialog.count()).toBe(0);
  await tap("fern/heading/back");
  await part("garden/heading/title").waitFor();
  expect(errors).toEqual([]);
});

changed(
  "updates the switch and checkbox, reorders stable rows and keeps section headers visible",
  async () => {
    await tap("garden/plants/r2/trail");
    expect(await part("garden/plants/r2/trail").getAttribute("aria-checked")).toBe("true");
    await tap("garden/tasks/r1/check");
    expect(await part("garden/tasks/r1/check").getAttribute("aria-checked")).toBe("true");
    await tap("garden/today/link");
    await expect.poll(() => part("garden/plants/r4/root").count()).toBe(1);
    expect(await part("garden/plants/r2/trail").getAttribute("aria-checked")).toBe("true");
    const fern = part("garden/plants/r1/root");
    const basil = part("garden/plants/r2/root");
    await expect.poll(async () => (await basil.boundingBox())!.y < (await fern.boundingBox())!.y).toBe(true);
    await tap("garden/today/link");
    await expect.poll(() => part("garden/plants/r4/root").count()).toBe(0);
    await page.mouse.move(180, 360);
    await page.mouse.wheel(0, 450);
    await expect.poll(() => part("garden/heading/sub").count()).toBe(0);
    await expect.poll(() => part("garden/heading/title").isVisible()).toBe(true);
    await page.mouse.wheel(0, -900);
    await expect.poll(() => part("garden/heading/sub").count()).toBe(1);
    expect(errors).toEqual([]);
  },
);

changed(
  "reflects real gallery loading, error and completion states and animates progress updates",
  async () => {
    await tap("garden/nav/r2/root");
    await part("activity/heading/title").waitFor();
    await tap("activity/week/link");
    await expect.poll(() => part("activity/total/title").count()).toBe(0);
    await expect.poll(() => part("activity/total/title").textContent()).toBe("2");
    await tap("activity/advance/root");
    await expect.poll(() => part("activity/total/title").textContent()).toBe("5");
    await tap("activity/nav/r1/root");
    await tap("garden/plants/r1/root");
    await tap("fern/error/root");
    await expect.poll(() => part("fern/plant_photo/photo").count()).toBe(0);
    await tap("fern/save/root");
    await expect.poll(() => part("fern/save/root").textContent()).toContain("Saving");
    await part("fern/done/title").waitFor();
    expect(await part("fern/done/title").textContent()).toBe("Watering logged");
    const check = part("fern/done/icon").locator("path");
    await expect.poll(() => check.getAttribute("stroke-dashoffset")).toBe(null);
    expect(errors).toEqual([]);
  },
);

changed(
  "shows the same end states without position flights in reduced motion and with agent actions",
  async () => {
    await openLab("reduce");
    await tap("garden/plants/r1/root");
    expect(await transforms("fern/heading/title")).toEqual([]);
    await tap("fern/heading/action");
    expect(await page.getByRole("dialog").evaluate((node) => getComputedStyle(node).transform)).not.toContain(
      ", 40)",
    );
    await openLab();
    await page.evaluate(() => window.__lmthingUI!.act({ address: "plants/r1/root", action: "press" }));
    await part("fern/heading/title").waitFor();
    expect(await transforms("fern/heading/title")).toEqual([]);
    expect(await styleOf("fern/heading/title", "opacity")).toBe("1");
    expect(errors).toEqual([]);
  },
);

const scenes = [
  ["toggle", () => tap("garden/plants/r2/trail")],
  ["check", () => tap("garden/tasks/r1/check")],
  ["reorder-insert-status", () => tap("garden/today/link")],
  ["remove", () => tap("garden/today/link")],
  [
    "scroll",
    async () => {
      await page.mouse.move(180, 360);
      await page.mouse.wheel(0, 450);
    },
  ],
  ["scroll-back", () => page.mouse.wheel(0, -900)],
  ["push", () => tap("garden/plants/r1/root")],
  ["sheet", () => tap("fern/heading/action")],
  ["sheet-dismiss", () => page.keyboard.press("Escape")],
  ["error", () => tap("fern/error/root")],
  ["submit-working-success", () => tap("fern/save/root")],
  ["back", () => tap("fern/heading/back")],
  ["tab", () => tap("garden/nav/r2/root")],
  ["roll-progress", () => tap("activity/advance/root")],
  ["loading-resolve", () => tap("activity/week/link")],
] as const;

it.runIf(Boolean(process.env.UI_MOTION_EVIDENCE))("renders contact sheets of each motion", async () => {
  for (const [label, action] of scenes) {
    await contactSheet(browser, page, `${baseline ? "before" : "after"}-${label}`, action);
  }
  expect(errors).toEqual([]);
});

it.runIf(Boolean(process.env.UI_MOTION_PERF))(
  "measures 390px frame cadence across the gallery journey",
  async () => {
    const samples = [];
    for (const [label, action] of scenes) {
      const { frames, droppedPercent } = await sampleMotionFrames(
        page,
        action,
        label === "submit-working-success" ? 1300 : 550,
      );
      samples.push({ label, frames, droppedPercent });
    }
    const worst = Math.max(...samples.map((sample) => sample.droppedPercent));
    console.log(JSON.stringify({ source: baseline ? "main" : "change", width: 390, worst, samples }));
    expect(errors).toEqual([]);
  },
);
