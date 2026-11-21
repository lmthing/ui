import { expect, it } from "vitest";
import { createServer } from "vite";
import { launchChrome } from "../../../scripts";
import { galleryConfig } from "../../../scripts/look";

it("lets a real human gesture confirm the handoff and leaves the declared loading control enabled", async () => {
  const route = "/host-command-fixture";
  const fixture = new URL("./phone.fixture.tsx", import.meta.url).pathname;
  const server = await createServer({
    ...galleryConfig(0),
    plugins: [
      {
        name: "host-command-fixture",
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
  try {
    await server.listen();
    const browser = await launchChrome();
    try {
      const page = await browser.newPage({ viewport: { width: 390, height: 700 } });
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.addInitScript("globalThis.process ??= { env: {} }; globalThis.__name = (fn) => fn");
      await page.goto(new URL(route, server.resolvedUrls!.local[0]).href);
      try {
        await page.getByRole("button", { name: "Open source" }).waitFor({ timeout: 18000 });
      } catch (error) {
        throw new Error(`Host command fixture did not mount: ${errors.join("; ")}`, { cause: error });
      }
      expect(await page.getByRole("button", { name: "Refresh" }).isEnabled()).toBe(true);
      expect(await page.getByTestId("home/loader/another").getAttribute("aria-busy")).toBe("true");
      await page.getByRole("button", { name: "Refresh" }).click();
      await page.waitForFunction(() => window.__lmthingUI !== undefined);
      const acceptedByAgent = await page.evaluate(() => {
        if (!window.__lmthingUI!.act({ address: "link", action: "press" }).ok) throw new Error("No request");
        return window.__lmthingUI!.act({ address: "confirm/confirm", action: "press" }).ok;
      });
      expect(acceptedByAgent).toBe(false);
      await page.getByRole("button", { name: "Confirm" }).click();
      await page.getByText("Handoff accepted").waitFor();
      expect(errors).toEqual([]);
    } finally {
      await browser.close();
    }
  } finally {
    await server.close();
  }
}, 60000);
