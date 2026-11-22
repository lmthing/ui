import { expect, it } from "vitest";
import { createServer } from "vite";
import { launchChrome } from "../../../../../scripts";
import { galleryConfig } from "../../../../../scripts/look";

const route = "/hiring-options-test";
const fixture = new URL("./HiringOptions.browser-fixture.tsx", import.meta.url).pathname;

function fixtureServer() {
  return createServer({
    ...galleryConfig(0),
    plugins: [
      {
        name: "hiring-options-test",
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
}

it("uses opt-in details and linked actions on a calm 390px phone", async () => {
  const server = await fixtureServer();
  try {
    await server.listen();
    const browser = await launchChrome();
    try {
      const page = await browser.newPage({ viewport: { width: 390, height: 700 } });
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.addInitScript("globalThis.process ??= { env: {} }; globalThis.__name = (fn) => fn");
      const base = server.resolvedUrls!.local[0];
      const part = (path: string) => page.getByTestId(`home/${path}`);
      const destination = page.getByTestId("destination");
      await page.goto(new URL(route, base).href);
      await part("c1/name")
        .waitFor()
        .catch((error: unknown) => {
          throw new Error(errors.join("\n") || String(error));
        });
      await part("c1/resume").click();
      await expect.poll(() => destination.textContent()).toBe("imani_resume");
      expect(await part("c1/r1/panel").textContent()).toContain("Ari Lane");
      await part("i1/reschedule").click();
      await expect.poll(() => destination.textContent()).toBe("followup_reschedule");
      expect(await part("i1/prep").textContent()).toContain("Interview prep");
      expect(await part("j1/easy_apply").textContent()).toBe("Easy apply");
      expect(await part("j1/benefit_4").textContent()).toBe("Paid leave");
      await page.goto(new URL(`${route}?closed`, base).href);
      await part("j1/easy_apply").waitFor();
      expect(await part("j1/apply").count()).toBe(0);
      expect(await part("i1/reschedule").count()).toBe(0);
      await page.goto(new URL(`${route}?default`, base).href);
      await part("j1/title").waitFor();
      for (const hidden of [
        "c1/resume",
        "c1/r1/panel",
        "i1/prep",
        "i1/reschedule",
        "j1/easy_apply",
        "j1/benefits",
      ])
        expect(await part(hidden).count()).toBe(0);
    } finally {
      await browser.close();
    }
  } finally {
    await server.close();
  }
}, 60000);
