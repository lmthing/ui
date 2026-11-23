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

async function look(id: string) {
  await page.goto(`${server.resolvedUrls!.local[0]}?c=${id}&w=390&preset=calm&mode=light`);
  await page.locator("[data-look-frame]").first().waitFor();
}

const frame = (name: string) => page.locator(`[data-look-frame="calm/${name}"]`);

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
  expect(await fallback.locator('[data-kit-photo-initial="WN"]').count()).toBe(1);
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
  expect(await fallback.getByText("Morning park walk").isVisible()).toBe(true);
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
