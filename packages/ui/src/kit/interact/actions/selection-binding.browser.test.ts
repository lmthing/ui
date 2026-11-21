import { fileURLToPath, URL } from "node:url";
import { expect, it } from "vitest";
import { createServer } from "vite";
import { galleryConfig, launchChrome } from "../../../../scripts/look";

const fixture = fileURLToPath(new URL("./selection-binding.browser-fixture.tsx", import.meta.url));

it("updates an already mounted selection view without a parent render", async () => {
  const server = await createServer({
    ...galleryConfig(0),
    plugins: [
      {
        name: "selection-binding-browser-test",
        configureServer(server) {
          server.middlewares.use("/selection-test", (_request, response) => {
            response.setHeader("Content-Type", "text/html");
            response.end(`<body><script type="module" src="/@fs${fixture}"></script></body>`);
          });
        },
      },
    ],
  });
  try {
    await server.listen();
    const browser = await launchChrome();
    try {
      const page = await browser.newPage();
      await page.addInitScript("globalThis.process ??= { env: {} }");
      await page.goto(`${server.resolvedUrls!.local[0]}selection-test`);
      const check = page.getByRole("button", { name: "Check row" });
      await check.waitFor();
      const single = page.getByRole("button", { name: "r2", exact: true });
      expect(await single.count()).toBe(0);
      await check.click();
      await single.waitFor({ timeout: 4000 });
      await single.click();
      await page.getByRole("button", { name: "r1,r2", exact: true }).waitFor({ timeout: 4000 });
    } finally {
      await browser.close();
    }
  } finally {
    await server.close();
  }
});
