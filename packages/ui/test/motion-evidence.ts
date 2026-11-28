import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { relative } from "node:path";
import { fileURLToPath, URL } from "node:url";
import type { Browser, Page } from "playwright-core";
import { build, preview, type InlineConfig, type Plugin } from "vite";

const folder = fileURLToPath(new URL("../shots/p5-designer-motion/", import.meta.url));
export { folder as motionEvidenceFolder };
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

async function startTrace(page: Page) {
  return page.evaluateHandle(() => {
    const events = ["pointerdown", "keydown", "wheel"] as const;
    const sample = () => {
      const focused = document.activeElement?.closest("[data-testid]");
      return focused?.getAttribute("data-testid") ?? document.activeElement?.tagName ?? null;
    };
    const source = sample();
    const focus: { ms: number; target: string | null }[] = [];
    const poses: ReturnType<typeof pose>[] = [];
    let trigger = 0;
    let input = "";
    let raf = 0;
    const clock = () => (input ? Math.round(performance.now() - trigger) : null);
    function pose() {
      const screen = document.querySelector<HTMLElement>("[data-kit-screen]");
      const dialog = screen?.querySelector<HTMLElement>('[role="dialog"]');
      return {
        ms: clock(),
        x: screen?.getBoundingClientRect().x,
        dialogY: dialog?.getBoundingClientRect().y,
        dialogOpacity: dialog && getComputedStyle(dialog).opacity,
      };
    }
    const paint = () => {
      poses.push(pose());
      raf = requestAnimationFrame(paint);
    };
    const begin = (event: Event) => {
      if (input) return;
      input = event instanceof KeyboardEvent ? `${event.type}:${event.key}` : event.type;
      trigger = performance.now();
      raf = requestAnimationFrame(paint);
    };
    const changed = () => {
      if (input) focus.push({ ms: clock()!, target: sample() });
    };
    for (const event of events) document.addEventListener(event, begin, true);
    document.addEventListener("focusin", changed, true);
    return {
      clock,
      finish: () => {
        cancelAnimationFrame(raf);
        for (const event of events) document.removeEventListener(event, begin, true);
        document.removeEventListener("focusin", changed, true);
        return { input, source, focus, settled: sample(), poses };
      },
    };
  });
}

export async function contactSheet(browser: Browser, page: Page, label: string, action: () => Promise<void>) {
  await mkdir(folder, { recursive: true });
  const frames = [await page.screenshot({ scale: "css" })];
  const trace = await startTrace(page);
  const times: (number | null)[] = [null];
  async function frame() {
    frames.push(await page.screenshot({ scale: "css" }));
    times.push(await trace.evaluate(({ clock }) => clock()));
  }
  try {
    const inFlight = action();
    for (let i = 0; i < 4; i++) await frame();
    await inFlight;
    if (label.endsWith("submit-working-success")) {
      await page.waitForTimeout(700);
      await frame();
    }
    await page.waitForTimeout(700);
    await frame();
    const result = await trace.evaluate(({ finish }) => finish());
    if (!result.input) throw new Error(`No interaction captured for ${label}`);
    await Promise.all([
      drawContactSheet(browser, label, frames, times),
      writeFile(`${folder}${label}.json`, JSON.stringify({ ...result, frames: times }, null, 2)),
    ]);
  } finally {
    await trace.evaluate(({ finish }) => finish()).catch(() => {});
    await trace.dispose();
  }
}

async function drawContactSheet(browser: Browser, label: string, frames: Buffer[], times: (number | null)[]) {
  const sheet = await browser.newPage({ viewport: { width: 702, height: 1013 } });
  try {
    const tiles = frames.map((png, index) => {
      const time = times[index];
      const mark = time == null ? "Before input" : `Captured by +${time} ms`;
      const end = index === frames.length - 1 ? " · Settled" : "";
      return `<figure><img src="data:image/png;base64,${png.toString("base64")}"><figcaption>${mark}${end}</figcaption></figure>`;
    });
    await sheet.setContent(`<style>
      body{display:grid;grid-template-columns:repeat(3,1fr);margin:0;background:rgb(224 226 230);}
      header{grid-column:1/-1;padding:8px;font:14px sans-serif;}
      figure{position:relative;margin:0;border:1px solid rgb(224 226 230);}
      img{display:block;width:100%;}figcaption{position:absolute;top:4px;left:4px;background:rgb(33 35 42);color:white;padding:2px 6px;}
      </style><header>Motion Lab · calm / light / 390 · ${label}</header>${tiles.join("")}`);
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
