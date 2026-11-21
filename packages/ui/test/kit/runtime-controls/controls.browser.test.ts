import { fileURLToPath, URL } from "node:url";
import { expect, it } from "vitest";
import { createServer } from "vite";
import { galleryConfig, launchChrome } from "../../../scripts/look";

const fixture = fileURLToPath(new URL("./controls.fixture.tsx", import.meta.url));

it("refreshes declared ranges on mounted controls, snaps human edits, and focuses a local anchor", async () => {
  const server = await createServer({
    ...galleryConfig(0),
    plugins: [
      {
        name: "runtime-controls-browser-test",
        configureServer(server) {
          server.middlewares.use("/runtime-controls", (_request, response) => {
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
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await page.addInitScript("globalThis.process ??= { env: {} }");
      await page.goto(`${server.resolvedUrls!.local[0]}runtime-controls`);
      const slider = page.getByRole("slider", { name: "Amount slider" });
      const input = page.getByRole("spinbutton", { name: "Amount" });
      await slider.press("End");
      expect(await input.inputValue()).toBe("0.3");
      expect(await input.getAttribute("aria-valuemax")).toBe("0.3");
      await page.getByRole("button", { name: "Raise cap" }).click();
      expect(await slider.getAttribute("aria-valuemax")).toBe("0.5");
      await input.fill("0.46");
      expect(await slider.getAttribute("aria-valuenow")).toBe("0.5");
      await page.getByRole("button", { name: "Go to note" }).click();
      expect(
        await page.getByRole("textbox", { name: "Note" }).evaluate((node) => node === document.activeElement),
      ).toBe(true);
    } finally {
      await browser.close();
    }
  } finally {
    await server.close();
  }
});
