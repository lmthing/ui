// tsx scripts/tools/look.ts <url> <out.png> [width] [--full] [--wait ms]: a headless screenshot with the console errors.
import { launchChrome } from "../../../../packages/ui/scripts/look/launch-chrome";

const [url, out, width = "1280"] = process.argv.slice(2);
if (!url || !out) throw new Error("Usage: look.ts <url> <out.png> [width] [--full] [--wait ms]");
const wait = Number(process.argv[process.argv.indexOf("--wait") + 1]) || 3000;
const browser = await launchChrome();
const page = await browser.newPage({ viewport: { width: Number(width), height: 900 } });
page.on("console", (m) => m.type() === "error" && console.log("console error:", m.text().slice(0, 300)));
page.on("pageerror", (e) => console.log("page error:", e.message.slice(0, 300)));
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(wait);
if (process.argv.includes("--full")) {
  const height = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < height; y += 500) {
    await page.evaluate((top) => scrollTo(0, top), y);
    await page.waitForTimeout(120);
  }
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(1200);
}
await page.screenshot({ path: out, fullPage: process.argv.includes("--full") });
await browser.close();
