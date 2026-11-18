import type { Browser } from "playwright-core";
import type { LookIssue } from "./checks";

export async function capture(
  browser: Browser,
  url: string,
  out: string,
  width: number,
  mode: string,
  content: string,
) {
  const page = await browser.newPage({ viewport: { width: width * 3 + 120, height: 900 } });
  // Playwright still serialises the small image/font readiness callback.
  await page.addInitScript("globalThis.__name = (fn) => fn");
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-look-frame]", { timeout: 15000 });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(Array.from(document.images).map((img) => img.decode().catch(() => undefined)));
  });
  await page.screenshot({ path: `${out}${width}-${mode}.png`, fullPage: true });
  await page.addScriptTag({ content });
  const found = await page.evaluate(() => window.lookChecks.find());
  if (width === 390) {
    await page.evaluate(() => window.lookChecks.drawMarks());
    await page.screenshot({ path: `${out}${width}-${mode}-marks.png`, fullPage: true });
  }
  const issues: (LookIssue & { width: number; mode: string })[] = found.map((issue) => ({
    ...issue,
    width,
    mode,
  }));
  for (const error of errors)
    issues.push({ kind: "console", frame: "page", part: "-", detail: error, width, mode });
  console.log(`${out}${width}-${mode}.png`);
  await page.close();
  return issues;
}
