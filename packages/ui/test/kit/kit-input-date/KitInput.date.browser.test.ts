import { afterAll, beforeAll, expect, it } from "vitest";
import type { Browser } from "playwright-core";
import { createServer, type ViteDevServer } from "vite";
import { galleryConfig, launchChrome } from "../../../scripts/look";

let server: ViteDevServer;
let browser: Browser;
const route = "/kit-date-fixture";
const fixture = new URL("./KitInput.date.page.tsx", import.meta.url).pathname;

beforeAll(async () => {
  server = await createServer({
    ...galleryConfig(0),
    plugins: [
      {
        name: "kit-date-fixture",
        configureServer({ middlewares }) {
          middlewares.use(route, (_request, response) => {
            response.setHeader("Content-Type", "text/html");
            response.end(
              `<!doctype html><div id="root"></div><script type="module" src="/@fs${fixture}"></script>`,
            );
          });
        },
      },
    ],
  });
  await server.listen();
  browser = await launchChrome();
});

afterAll(async () => {
  await browser?.close();
  await server?.close();
});

it("keeps sequential keyboard edits local until a real date is complete", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.addInitScript("globalThis.process ??= { env: {} }; globalThis.__name = (fn) => fn");
  try {
    await page.goto(new URL(route, server.resolvedUrls!.local[0]).href);
    await page.waitForFunction(() => Boolean(window.__lmthingUI));
    const field = page.getByRole("textbox", { name: "Date" });
    const reading = () => page.evaluate(() => window.__lmthingUI!.read());
    const expectDate = async (value: string) => expect(await reading()).toContain(`Date ${value}`);
    expect(await field.getAttribute("data-testid")).toBe("home/c1/date");
    expect(await field.inputValue()).toBe("2026-11-21");

    await field.press("ControlOrMeta+a");
    await field.pressSequentially("2024-02-2");
    expect(await field.inputValue()).toBe("2024-02-2");
    await expectDate("2026-11-21");
    await field.pressSequentially("9");
    expect(await field.inputValue()).toBe("2024-02-29");
    await expectDate("2024-02-29");

    await field.press("ControlOrMeta+a");
    await field.pressSequentially("2026-02-30");
    expect(await field.inputValue()).toBe("2026-02-30");
    await expectDate("2024-02-29");
    await field.press("Tab");
    expect(await field.inputValue()).toBe("2024-02-29");

    await field.fill("");
    expect(await field.inputValue()).toBe("");
    await expectDate("2024-02-29");
    expect(
      await page.evaluate(() =>
        window.__lmthingUI!.act({ address: "c1/date", action: "set", value: "2027-01-31" }),
      ),
    ).toMatchObject({ ok: true });
    expect(await field.inputValue()).toBe("2027-01-31");
    await expectDate("2027-01-31");
  } finally {
    await page.close();
  }
});
