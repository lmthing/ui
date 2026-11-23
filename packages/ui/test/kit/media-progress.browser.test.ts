import { afterAll, beforeAll, expect, it } from "vitest";
import type { Browser, Page } from "playwright-core";
import { createServer, type ViteDevServer } from "vite";
import { galleryConfig, launchChrome } from "../../scripts/look";

let server: ViteDevServer, browser: Browser, page: Page;

beforeAll(async () => {
  server = await createServer(galleryConfig(0));
  await server.listen();
  browser = await launchChrome();
  page = await browser.newPage({ viewport: { width: 510, height: 844 } });
}, 60000);

afterAll(async () => {
  await browser?.close();
  await server?.close();
});

async function look(id: string, omitHidden = false) {
  await page.goto(
    `${server.resolvedUrls!.local[0]}?c=${id}&w=390&preset=calm&mode=light${omitHidden ? "&omit-hidden" : ""}`,
  );
  await page.locator("[data-look-frame]").first().waitFor();
}

const frame = (name: string) => page.locator(`[data-look-frame$="_calm_light_fixture_${name}"]`);

async function expectLoaded(address: string) {
  const media = page.getByTestId(address);
  await media.waitFor();
  await expect
    .poll(() =>
      media
        .locator("img")
        .evaluateAll((images) => images.some((img) => (img as HTMLImageElement).naturalWidth > 0)),
    )
    .toBe(true);
}

it("renders supplied thumbnails and keeps a real record readable when its local image is absent", async () => {
  await look("List");
  await expectLoaded("browse_thumbnails/records/r1/icon");
  await expectLoaded("browse_thumbnails/records/r2/icon");
  const fallback = page.getByTestId("browse_thumbnails/records/r3/icon");
  expect(await fallback.locator("img").count()).toBe(0);
  expect(await fallback.locator('[data-kit-photo-initial="W"]').count()).toBe(1);
  expect(await frame("browse_thumbnails").getByText("Watering notes").isVisible()).toBe(true);
});

it("collapses unresolved media and replaces a failed decode with compact status, not an image frame", async () => {
  await look("Photo");
  await expectLoaded("sketch_review/image/photo");
  const fallback = frame("media_fallback");
  await fallback.getByText("Image unavailable").waitFor();
  expect(await fallback.getByTestId("media_fallback/missing/root").count()).toBe(0);
  expect(await fallback.getByTestId("media_fallback/unavailable/root").count()).toBe(0);
  expect(await fallback.getByRole("img").count()).toBe(0);
  expect(await fallback.getByText("Morning park walk").count()).toBe(0);
  expect(await fallback.getByText("The walk notes are still available.").isVisible()).toBe(true);
});

it("loads only the available gallery images and retains their original part addresses", async () => {
  await look("Gallery");
  await expectLoaded("garden_gallery/photos/r1/photo");
  await expectLoaded("garden_gallery/photos/r3/photo");
  const gallery = frame("garden_gallery");
  expect(await gallery.getByRole("img").count()).toBe(2);
  expect(await gallery.getByTestId("garden_gallery/photos/r2/root").count()).toBe(0);
  expect(await gallery.getByText("Missing local sample").count()).toBe(0);
  const unavailable = await page.evaluate(() =>
    window.__lmthingUI?.act({ address: "photos/r2", action: "press" }, { dryRun: true }),
  );
  expect(unavailable).toMatchObject({ ok: false, code: "not_mounted" });
});

it("draws a full-width carousel page and advances to the next original address", async () => {
  await look("Gallery");
  const first = page.getByTestId("gallery_calm_light_1_filled/c1/r1/photo");
  const second = page.getByTestId("gallery_calm_light_1_filled/c1/r2/photo");
  await first.waitFor();
  const start = await first.evaluate((node) => {
    const scroll = node.closest('[style*="scroll-snap-type"]') as HTMLElement;
    if (!scroll) throw new Error("Carousel is not a snapping scroller");
    const box = node.getBoundingClientRect();
    return { width: box.width, viewport: scroll.clientWidth, left: box.left };
  });
  expect(start.width).toBeCloseTo(start.viewport, 0);
  await second.evaluate((node) => node.scrollIntoView({ inline: "start", block: "nearest" }));
  await expect.poll(async () => Math.round((await second.boundingBox())!.x)).toBe(Math.round(start.left));
});

it("shows completed/total, due date, remaining work and the next milestone without another headline", async () => {
  await look("Progress");
  for (const name of ["quilt_tracker", "quilt_detail"]) {
    const project = frame(name);
    await project.getByText("Join the quilt top").waitFor();
    expect(await project.getByText("Birthday quilt", { exact: true }).count()).toBe(1);
    expect(await project.getByText("Due 5 Dec 2026 · 4 blocks remaining").isVisible()).toBe(true);
    expect(
      await project
        .getByText(name === "quilt_tracker" ? "8 of 12 blocks" : "of 12 blocks", { exact: true })
        .isVisible(),
    ).toBe(true);
    if (name === "quilt_detail") expect(await project.getByText("8", { exact: true }).isVisible()).toBe(true);
  }
});

it("does not draw read-only stars or a rating label when there is no score", async () => {
  await look("Scale");
  const unscored = frame("unscored_rating");
  await unscored.getByText("Riverside dog park").waitFor();
  expect(await unscored.getByTestId("unscored_rating/rating/root").count()).toBe(0);
  expect(await unscored.getByText("Walker rating").count()).toBe(0);
  expect(await page.getByLabel("4.5 of 5").first().isVisible()).toBe(true);
});

it.each([
  ["Photo", "media_fallback", "damaged", "Image unavailable"],
  ["Scale", "unscored_rating", "note", "The east gate opens onto the riverside path."],
])("%s leaves exactly the spacing of an omitted line", async (id, screen, next, ready) => {
  async function measure(omitHidden: boolean) {
    await look(id, omitHidden);
    await frame(screen).getByText(ready, { exact: true }).waitFor();
    const title = (await page.getByTestId(`${screen}/header/title`).boundingBox())!;
    const content = (await page.getByTestId(`${screen}/${next}/root`).boundingBox())!;
    return content.y - title.y - title.height;
  }
  expect(await measure(false)).toBeCloseTo(await measure(true), 0);
});
