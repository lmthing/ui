// Two images per component from the running gallery: its first preview (calm, light, at 2x) and all of
// its variants (calm, light and dark, at 1x). JPEG keeps a full gallery within the artifact size limits.
import type { Browser, Page } from "playwright-core";
import { createServer } from "vite";
import { galleryConfig } from "../gallery-config";
import { launchChrome } from "../launch-chrome";

const viewport = { width: 1240, height: 900 };

async function open(browser: Browser, url: string, id: string, scale: number): Promise<Page> {
  const page = await browser.newPage({ viewport, deviceScaleFactor: scale });
  await page.addInitScript("globalThis.__name = (fn) => fn");
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForSelector(`[data-testid="variants_${id}"]`, { timeout: 20000 });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(Array.from(document.images).map((img) => img.decode().catch(() => undefined)));
  });
  return page;
}

/** The first preview's component, without the preview label or the frame's minimum height. */
function firstComponentBox(id: string) {
  const preview = document.querySelector(`[data-testid="variants_${id}"] [data-testid^="preview_"]`);
  let frame = preview?.lastElementChild ?? null;
  while (frame && frame.children.length === 1 && getComputedStyle(frame).paddingTop === "0px")
    frame = frame.firstElementChild;
  const r = (frame?.firstElementChild ?? frame)!.getBoundingClientRect();
  return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height };
}

async function shootOne(browser: Browser, base: string, id: string, dir: string) {
  const card = await open(browser, `${base}?c=${id}&preset=calm&mode=light`, id, 2);
  const box = await card.evaluate(firstComponentBox, id);
  const pad = 16;
  const clip = { x: box.x - pad, y: box.y - pad, width: box.width + 2 * pad, height: box.height + 2 * pad };
  await card.screenshot({ path: `${dir}/${id}.card.jpg`, type: "jpeg", quality: 82, clip, fullPage: true });
  await card.close();
  const grid = await open(browser, `${base}?c=${id}&preset=calm`, id, 1);
  await grid
    .locator(`[data-testid="variants_${id}"]`)
    .screenshot({ path: `${dir}/${id}.grid.jpg`, type: "jpeg", quality: 62 });
  await grid.close();
}

/** Shoots each component into `dir` (`<Id>.card.jpg`, `<Id>.grid.jpg`). */
export async function shootComponents(ids: readonly string[], dir: string) {
  const server = await createServer(galleryConfig(0));
  await server.listen();
  const base = server.resolvedUrls?.local[0];
  if (!base) throw new Error("The gallery server did not start.");
  const browser = await launchChrome();
  try {
    for (const id of ids) {
      await shootOne(browser, base, id, dir);
      console.log(`shot ${id}`);
    }
  } finally {
    await browser.close();
    await server.close();
  }
}
