// One-off screenshots for review: the Try panel (collapsed ops, chips, closest-recording status) and an index
// thumbnail placeholder while images are still loading.
import { launchChrome } from "../../../../packages/ui/scripts/look/launch-chrome";

const [port, out] = process.argv.slice(2);
const base = `http://127.0.0.1:${port}/`;
const b = await launchChrome();
for (const w of [1280, 390]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 } });
  await p.goto(`${base}#try`, { waitUntil: "networkidle" });
  const box = p.getByLabel("What should the app be?");
  await box.waitFor({ timeout: 20000 });
  await box.fill("a bakery with a loyalty card");
  await p.getByRole("button", { name: "Build" }).click();
  await p.waitForFunction(() => document.querySelectorAll(".try .stream .line-in").length >= 4, null, {
    timeout: 30000,
  });
  await p.waitForTimeout(2500);
  await p.locator("#try").scrollIntoViewIfNeeded();
  await p.screenshot({ path: `${out}/try-${w}.png` });
  await p.close();
  const q = await b.newPage({ viewport: { width: w, height: 900 } });
  await q.route("**/gallery/shots/**", (route) => setTimeout(() => route.continue(), 4000));
  await q.goto(`${base}#/components`, { waitUntil: "domcontentloaded" });
  await q.waitForSelector(".specimen");
  await q.waitForTimeout(900);
  await q.screenshot({ path: `${out}/index-loading-${w}.png` });
  await q.waitForTimeout(5000);
  await q.screenshot({ path: `${out}/index-loaded-${w}.png` });
  await q.close();
}
await b.close();
