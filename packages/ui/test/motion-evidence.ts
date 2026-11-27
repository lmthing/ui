import { mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { relative } from "node:path";
import { fileURLToPath, URL } from "node:url";
import type { Browser, Page } from "playwright-core";
import type { Plugin } from "vite";

const folder = fileURLToPath(new URL("../shots/p5-designer-motion/", import.meta.url));
const project = fileURLToPath(new URL("../../../", import.meta.url));

/** Same gallery and actions, with only the changed kit sources loaded from main. */
export function baselineMotionKit(): Plugin {
  const git = (...args: string[]) => execFileSync("git", ["-C", project, ...args], { encoding: "utf8" });
  const sources = new Set(
    git("diff", "--name-only", "--diff-filter=M", "main", "--", "packages/ui/src").trim().split("\n"),
  );
  return {
    name: "baseline-motion-kit",
    enforce: "pre",
    load(id) {
      const path = relative(project, id.split("?")[0]!);
      if (sources.has(path)) return git("show", `main:${path}`);
    },
  };
}

export async function contactSheet(browser: Browser, page: Page, label: string, action: () => Promise<void>) {
  if (!process.env.UI_MOTION_EVIDENCE) return action();
  await mkdir(folder, { recursive: true });
  const frames = [await page.screenshot({ scale: "css" })];
  const inFlight = action();
  for (let frame = 0; frame < 4; frame++) {
    frames.push(await page.screenshot({ scale: "css" }));
  }
  await inFlight;
  // The last frame shows the settled layout, not a later interaction.
  await page.waitForTimeout(850);
  frames.push(await page.screenshot({ scale: "css" }));
  const sheet = await browser.newPage({ viewport: { width: 702, height: 1013 } });
  try {
    const tiles = frames.map(
      (png, index) =>
        `<figure><img src="data:image/png;base64,${png.toString("base64")}"><figcaption>${index + 1}</figcaption></figure>`,
    );
    await sheet.setContent(`<style>
      body{display:grid;grid-template-columns:repeat(3,1fr);margin:0;background:#e0e2e6;}
      figure{position:relative;margin:0;border:1px solid #e0e2e6;}
      img{display:block;width:100%;}figcaption{position:absolute;top:4px;left:4px;background:#21232a;color:white;padding:2px 6px;}
      </style>${tiles.join("")}`);
    await sheet.screenshot({ path: `${folder}${label}.png`, fullPage: true });
  } finally {
    await sheet.close();
  }
}

export async function sampleMotionFrames(page: Page, action: () => Promise<void>, settleMs: number) {
  const sample = await page.evaluateHandle(() => {
    const frames: number[] = [];
    let id = 0;
    const next = (now: number) => {
      frames.push(now);
      id = requestAnimationFrame(next);
    };
    id = requestAnimationFrame(next);
    return {
      stop: () => {
        cancelAnimationFrame(id);
        return frames;
      },
    };
  });
  try {
    await action();
    await page.waitForTimeout(settleMs);
    const frames = await sample.evaluate(({ stop }) => stop());
    if (frames.length < 2) throw new Error("Chromium did not produce a frame sample");
    const expected = Math.round((frames.at(-1)! - frames[0]!) / (1000 / 60));
    return {
      frames: frames.length,
      droppedPercent: Math.max(0, (expected - frames.length + 1) / expected) * 100,
    };
  } finally {
    await sample.dispose();
  }
}
