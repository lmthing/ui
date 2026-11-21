import { expect, it } from "vitest";
import { createServer } from "vite";
import { launchChrome } from "../../../../../scripts";
import { galleryConfig } from "../../../../../scripts/look";

it("clicks and keyboards display labels to move a card using stable enum values", async () => {
  const route = "/kit-columns-enum-test";
  const fixture = new URL("./ApplicantPipeline.browser-fixture.tsx", import.meta.url).pathname;
  const server = await createServer({
    ...galleryConfig(0),
    plugins: [
      {
        name: "kit-columns-enum-test",
        configureServer({ middlewares }) {
          middlewares.use(route, (_request, response) => {
            response.setHeader("Content-Type", "text/html");
            response.end(
              `<!doctype html><div id="root" style="width:390px"></div><script type="module" src="/@fs${fixture}"></script>`,
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
      await page.addInitScript("globalThis.process ??= { env: {} }; globalThis.__name = (fn) => fn");
      await page.goto(new URL(route, server.resolvedUrls!.local[0]).href);
      const sam = page.getByTestId("home/p1/r1/root");
      const count = (stage: string) => page.getByTestId(`home/p1/${stage}`).textContent();
      const button = (stage: string) => sam.getByRole("button", { name: `Move Sam Patel to ${stage}` });
      await button("Interview").waitFor({ timeout: 15000 });
      expect(await count("screening")).toBe("1");
      expect(await count("interview")).toBe("0");
      await button("Interview").click();
      await button("Screening").waitFor();
      expect(await count("screening")).toBe("0");
      expect(await count("interview")).toBe("1");
      expect(await button("Interview").count()).toBe(0);
      await button("Screening").press("Enter");
      await button("Interview").waitFor();
      expect(await count("screening")).toBe("1");
      expect(await count("interview")).toBe("0");
    } finally {
      await browser.close();
    }
  } finally {
    await server.close();
  }
}, 60000);
