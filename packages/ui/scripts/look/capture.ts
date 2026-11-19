import type { Browser, Page } from "playwright-core";
import type { LookIssue } from "./checks";

export async function capture(
  browser: Browser,
  url: string,
  out: string,
  width: number,
  mode: string,
  content: string,
  variantSheet = false,
) {
  const page = await browser.newPage({ viewport: { width: width * 3 + 120, height: 900 } });
  // Playwright still serialises the small image/font readiness callback.
  await page.addInitScript("globalThis.__name = (fn) => fn");
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    await page.goto(url, { waitUntil: "networkidle" });
    const selector = variantSheet ? "[data-look-variants]" : "[data-look-frame]";
    await page.waitForSelector(selector, { state: variantSheet ? "attached" : "visible", timeout: 15000 });
    const found =
      variantSheet && !(await page.locator("[data-look-frame]").count())
        ? []
        : await captureFrames(page, out, width, mode, content, variantSheet);
    const issues: (LookIssue & { width: number; mode: string })[] = found.map((issue) => ({
      ...issue,
      width,
      mode,
    }));
    for (const detail of errors)
      issues.push({ kind: "console", frame: "page", part: "-", detail, width, mode });
    return issues;
  } finally {
    await page.close();
  }
}

async function captureFrames(
  page: Page,
  out: string,
  width: number,
  mode: string,
  content: string,
  variantSheet: boolean,
) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(Array.from(document.images).map((img) => img.decode().catch(() => undefined)));
  });
  const shot = `${out}${variantSheet ? "variants" : `${width}-${mode}`}.png`;
  await page.screenshot({ path: shot, fullPage: true });
  await page.addScriptTag({ content });
  const found = await page.evaluate(() => window.lookChecks.find());
  if (!variantSheet && width === 390) {
    await page.evaluate(() => window.lookChecks.drawMarks());
    await page.screenshot({ path: `${out}${width}-${mode}-marks.png`, fullPage: true });
  }
  console.log(shot);
  return found;
}
