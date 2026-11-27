import { mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { relative } from "node:path";
import { fileURLToPath, URL } from "node:url";
import type { Browser, Page } from "playwright-core";
import { build, preview, type InlineConfig, type Plugin } from "vite";

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

export async function releaseGallery(config: InlineConfig, baseline: boolean) {
  const buildOptions = { outDir: `${folder}build-${baseline ? "main" : "change"}`, emptyOutDir: true };
  await build({ ...config, mode: "production", logLevel: "error", build: buildOptions });
  return preview({ ...config, build: buildOptions, preview: { host: "127.0.0.1", port: 0 } });
}

export async function contactSheet(browser: Browser, page: Page, label: string, action: () => Promise<void>) {
  if (!process.env.UI_MOTION_EVIDENCE) return action();
  await mkdir(folder, { recursive: true });
  const frames = [await page.screenshot({ scale: "css" })];
  const times = ["Source"];
  const started = performance.now();
  const capture = async (state = "") => {
    times.push(`${state}${Math.round(performance.now() - started)} ms`);
    frames.push(await page.screenshot({ scale: "css" }));
  };
  const inFlight = action();
  for (let frame = 0; frame < 4; frame++) {
    await capture();
  }
  await inFlight;
  if (label.endsWith("submit-working-success")) {
    await page.waitForTimeout(700);
    await capture();
    await page.waitForTimeout(150);
    await capture();
  }
  // The last frame shows the settled layout, not a later interaction.
  await page.waitForTimeout(700);
  await capture("Settled · ");
  const sheet = await browser.newPage({ viewport: { width: 702, height: 1013 } });
  try {
    const tiles = frames.map(
      (png, index) =>
        `<figure><figcaption>${times[index]}</figcaption><img src="data:image/png;base64,${png.toString("base64")}"></figure>`,
    );
    await sheet.setContent(`<style>
      body{display:grid;grid-template-columns:repeat(3,1fr);margin:0;background:rgb(224 226 230);font:14px system-ui;}
      header{grid-column:1/-1;padding:8px;}
      figure{margin:0;border:1px solid rgb(224 226 230);}
      img{display:block;width:100%;}figcaption{background:rgb(33 35 42);color:white;padding:2px 6px;}
      </style><header>Calm preset · light · 390px · ${label}</header>${tiles.join("")}`);
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
