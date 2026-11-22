import { expect, it } from "vitest";
import { createServer } from "vite";
import { galleryConfig, launchChrome } from "../../../scripts/look";

it("mounts durable rows and uses the same choices for taps and agent steps", async () => {
  const route = "/collections-fixture";
  const fixture = new URL("./collections.view.tsx", import.meta.url).pathname;
  const server = await createServer({
    ...galleryConfig(0),
    plugins: [
      {
        name: "collections-fixture",
        configureServer({ middlewares }) {
          middlewares.use(route, (_request, response) => {
            response.setHeader("Content-Type", "text/html");
            response.end(`<div id="root"></div><script type="module" src="/@fs${fixture}"></script>`);
          });
        },
      },
    ],
  });
  await server.listen();
  const browser = await launchChrome();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.addInitScript("globalThis.process ??= { env: {} }; globalThis.__name = (fn) => fn");
    await page.goto(new URL(route, server.resolvedUrls!.local[0]).href);
    await page.waitForFunction(() => Boolean(window.__lmthingUI));
    const part = (target: string) => page.getByTestId(`home/c1/${target}`);
    await part("r_note_a/root").click();
    expect(await part("r_note_a/status").textContent()).toBe("Selected");
    await part("r_link_a/root").click();
    expect(await part("r_link_a/status").textContent()).toBe("Selected");
    await part("r_link_a/save").click();
    expect(await part("r_link_a/save").getAttribute("aria-checked")).toBe("true");
    await part("r_note_a/move").click();
    const order = await page.getByTestId(/^home\/c1\/r_note_[ab]\/root$/).allTextContents();
    expect(order).toEqual(["Note B", "Note A"]);
    expect(await part("r_note_a/status").textContent()).toBe("Selected");
    expect(await part("r1/pick_2").isDisabled()).toBe(true);
    await part("r1/pick_1").click();
    await part("r1/pick_2").click();
    expect(await part("r1/pick_2").getAttribute("aria-checked")).toBe("true");
    await part("r1/choice_1").click();
    const reading = await page.evaluate(() => window.__lmthingUI!.read());
    expect(reading).toContain('[c1/r1/choice_1 select = "b"; choices ["a","b"]]');
    expect(reading).toContain("[c1/r_link_a/save check:done]");
    const agent = await page.evaluate(() =>
      window.__lmthingUI!.act({ address: "c1/r_note_a/move", action: "move", value: "r_note_b" }),
    );
    expect(agent.ok).toBe(true);
    expect(await page.getByTestId(/^home\/c1\/r_note_[ab]\/root$/).allTextContents()).toEqual([
      "Note A",
      "Note B",
    ]);
  } finally {
    await browser.close();
    await server.close();
  }
}, 60000);
