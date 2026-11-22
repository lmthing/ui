import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer, type ViteDevServer } from "vite";
import { bold, ink, moss, themeRoles } from "../../../packages/ui/src/catalog/themes";
import { launchChrome } from "../../../packages/ui/scripts/look/launch-chrome";
import { site } from "../src/data/site";
import { siteViteConfig } from "./vite-config";

const packs = site.packs.filter((pack) => pack.lines.length > 0);
const workedFigures = {
  invest: {
    "h2/r1/value": /^Value\s*\$900$/,
    "p1/value": /^\$1,108$/,
    "p1/contributed": /^\$1,000$/,
  },
  books: {
    "p1/profit": /^£450$/,
    "v1/result": /^£24$/,
    "p3/net_pay": /^£108$/,
    "l1/total_in": /^£660$/,
    "l2/total_in": /^£180$/,
  },
  projects: {
    "m1/r2/missing": /^Still needed: Home page design, About page design, Contact page design$/,
    "m1/r2/due": /^Due 24 Nov 2026$/,
  },
  inventory: { "s2/r2/count": /^14 items$/, "s2/r3/count": /^1 item$/ },
  community: {
    "m2/r1/dues": /^Dues paid$/,
    "m2/r9/dues": /^Dues due$/,
    "s2/r1/claimants": /^Ana Reed$/,
  },
  commerce: { "checkout_options/total": /^\$16$/ },
  mind: {
    "mood_patterns/r1/finding": /^Higher mood with Outdoors$/,
    "mood_patterns/r1/with": /\b4\b/,
    "mood_patterns/r1/without": /\b2\b/,
  },
  paperwork: { "t1/r1/matched": /^1$/, "t1/r2/matched": /^5$/ },
  trips: { "w1/today": /^14° \/ 5°C$/, "c1/rate_date": /^Rate as of 19 Nov 2026$/ },
  places: { "d2/r1/minutes": /^2 min$/, "m1/r3/distance": /^1\.2 km$/ },
  team: { "t1/elapsed": /^2:35:00$/, "t1/breaks": /^1 break today$/ },
  events: { "d1/arrivals": /^0 of 1$/, "d1/r1/name": /^Imani Cole$/ },
};
let server: ViteDevServer;
let browser: Awaited<ReturnType<typeof launchChrome>>;

async function startSite() {
  server = await createServer({
    ...siteViteConfig("dist"),
    server: { host: "127.0.0.1", port: 0 },
  });
  await server.listen();
  browser = await launchChrome();
}

// Opt in with CHROME so the ordinary site suite does not require a browser.
describe.runIf(Boolean(process.env.CHROME))("worked examples", () => {
  beforeAll(startSite, 60000);
  afterAll(async () => {
    await browser?.close();
    await server?.close();
  });

  it("applies the selected accent and mode to an already mounted phone", async () => {
    const page = await browser.newPage({ colorScheme: "light" });
    try {
      await page.goto(`${server.resolvedUrls!.local[0]}#/p/commerce`);
      const total = page
        .getByRole("figure", { name: "bold preset", exact: true })
        .getByTestId("commerce_app/checkout_options/total");
      const colors = () =>
        total.evaluate((node) => {
          const style = getComputedStyle(node);
          return [style.getPropertyValue("--bg").trim(), style.getPropertyValue("--accent").trim()];
        });
      const light = themeRoles(bold, moss, "light");
      expect(await colors()).toEqual([light.bg, light.accent]);
      // An in-place palette switch must not remount the phone or reset its session.
      await total.evaluate((node) => ((node as HTMLElement).dataset.themeCheck = "mounted"));
      await page.getByRole("button", { name: /^Theme:/ }).click();
      await page.getByRole("radio", { name: "ink", exact: true }).check();
      const lightInk = themeRoles(bold, ink, "light");
      await expect.poll(colors).toEqual([lightInk.bg, lightInk.accent]);
      await page.getByRole("radio", { name: "dark", exact: true }).check();
      const dark = themeRoles(bold, ink, "dark");
      await expect.poll(colors).toEqual([dark.bg, dark.accent]);
      expect(await total.getAttribute("data-theme-check")).toBe("mounted");
    } finally {
      await page.close();
    }
  }, 45000);

  it.each(Object.entries(workedFigures))(
    "%s renders figures from its worked records",
    async (id, figures) => {
      const page = await browser.newPage({ viewport: { width: 390, height: 900 }, colorScheme: "light" });
      try {
        await page.clock.setFixedTime(new Date("2026-11-28T12:00:00Z"));
        await page.goto(`${server.resolvedUrls!.local[0]}#/p/${id}`);
        const phone = page.getByRole("figure", { name: "calm preset", exact: true });
        await phone.locator(".is_ScrollView").first().waitFor({ timeout: 20000 });
        for (const [part, figure] of Object.entries(figures)) {
          const value = phone.getByTestId(`${id}_app/${part}`);
          await value.waitFor({ state: "visible", timeout: 5000 });
          expect(await value.innerText(), `${id}/${part}`).toMatch(figure);
        }
        if (id === "commerce") {
          const quantity = phone.getByTestId("commerce_app/basket_items/r1/qty");
          const total = phone.getByTestId("commerce_app/checkout_options/total");
          await quantity.getByRole("button").last().click({ timeout: 5000 });
          expect(await phone.getByTestId("commerce_app/basket_items/total").innerText()).toBe("$22.00");
          await expect.poll(() => total.innerText()).toBe("$22");
          const otherPreset = page.getByRole("figure", { name: "bold preset", exact: true });
          expect(await otherPreset.getByTestId("commerce_app/checkout_options/total").innerText()).toBe(
            "$16",
          );
          await quantity.getByRole("button").first().click({ timeout: 5000 });
          await expect.poll(() => total.innerText()).toBe("$16");
        }
        if (id === "paperwork") {
          const reviewed = phone.getByTestId("paperwork_app/r2/r5/reviewed");
          const matched = phone.getByTestId("paperwork_app/t1/r2/matched");
          await reviewed.click({ timeout: 5000 });
          await expect.poll(() => matched.innerText()).toBe("6");
          await reviewed.click({ timeout: 5000 });
          await expect.poll(() => matched.innerText()).toBe("5");
        }
      } finally {
        await page.close();
      }
    },
    45000,
  );

  it.each(packs)(
    "$id has a usable worked-example body in every preset",
    async ({ id }) => {
      const page = await browser.newPage({ viewport: { width: 390, height: 900 }, colorScheme: "light" });
      try {
        await page.goto(`${server.resolvedUrls!.local[0]}#/p/${id}`);
        for (const { id: preset } of site.presets) {
          const phone = page.getByRole("figure", { name: `${preset} preset`, exact: true });
          const body = phone.locator(".is_ScrollView").first();
          const summary = `${id}/${preset}`;
          const { height, frameHeight } = await body.evaluate(
            (node) => ({
              height: node.clientHeight,
              frameHeight: node.closest(".phone-screen")!.clientHeight,
            }),
            undefined,
            { timeout: 20000 },
          );
          expect(height, `${summary} body height`).toBeGreaterThanOrEqual(
            Math.max(1, Math.floor(frameHeight / 2)),
          );
          if (id === "team") {
            const handover = body.getByTestId("team_app/h4/r1/seen");
            expect(await handover.getAttribute("aria-checked")).toBe("false");
            await handover.click({ timeout: 5000 });
            await handover.and(body.getByRole("img", { name: /^Seen:/ })).waitFor({ timeout: 5000 });
            expect(
              await body.evaluate((node) => node.scrollTop),
              `${summary} scroll position`,
            ).toBeGreaterThan(0);
          } else {
            const action = body
              .getByRole("button", { disabled: false })
              .or(body.getByRole("checkbox", { disabled: false }))
              .or(body.getByRole("radio", { disabled: false }))
              .or(body.getByRole("switch", { disabled: false }))
              .and(body.locator(`[data-testid^="${id}_app/"]`))
              .first();
            await action.click({ timeout: 5000 });
          }
        }
      } finally {
        await page.close();
      }
    },
    45000,
  );
});
