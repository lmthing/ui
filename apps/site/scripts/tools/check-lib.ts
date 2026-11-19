// Shared by the site checks: the base URL, the screenshot folder, the build data, `expect` and `open`.
import { mkdirSync, readFileSync } from "node:fs";
import type { SiteData } from "../site-types";
import { launchChrome } from "../../../../packages/ui/scripts/look/launch-chrome";

export const [base = "http://localhost:5199/", shots = "shots"] = process.argv.slice(2);
mkdirSync(shots, { recursive: true });
export const data = JSON.parse(
  readFileSync(new URL("../../src/generated/site-data.json", import.meta.url).pathname, "utf8"),
) as SiteData;
export type Browser = Awaited<ReturnType<typeof launchChrome>>;
export const failures: string[] = [];
export const expect = (ok: boolean, what: string) => (
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`),
  ok || failures.push(what)
);

export async function open(browser: Browser, width: number, init?: string) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  page.on("pageerror", (e) => failures.push(`pageerror: ${e.message.slice(0, 200)}`));
  page.on(
    "console",
    (m) =>
      m.type() === "error" &&
      !/Failed to load resource/.test(m.text()) &&
      failures.push(`console: ${m.text().slice(0, 200)}`),
  );
  if (init) await page.addInitScript(init);
  return page;
}
