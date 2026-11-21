import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer, type ViteDevServer } from "vite";
import { launchChrome } from "../../../packages/ui/scripts/look/launch-chrome";
import { site } from "../src/data/site";
import { siteViteConfig } from "./vite-config";

const packs = site.packs.filter((pack) => pack.lines.length > 0);
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
