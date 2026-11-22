import { expect, it } from "vitest";
import { createServer } from "vite";
import { galleryConfig, launchChrome } from "../../../../../scripts/look";

const route = "/buzzer-pad-test";
const fixture = new URL("./BuzzerPad.fixture.tsx", import.meta.url).pathname;

it("locks on pointer down, permits a late keyboard buzz, and rearms on reset", async () => {
  const server = await createServer({
    ...galleryConfig(0),
    plugins: [
      {
        name: "buzzer-pad-test",
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
  const browser = await launchChrome();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.addInitScript("globalThis.process ??= { env: {} }; globalThis.__name = (fn) => fn");
    await page.goto(new URL(route, server.resolvedUrls!.local[0]).href);
    const part = (name: string) => page.getByTestId(`home/b1/${name}`);
    const winner = part("winner");
    const first = part("r2/buzz");
    await first.hover();
    await page.mouse.down();
    expect(await winner.innerText()).toBe("Juniper buzzed first");
    expect(await first.getAttribute("aria-disabled")).toBe("true");
    await page.mouse.up();
    const late = part("r1/buzz");
    await late.press("Enter");
    const delta = part("r1/delta");
    const gap = await delta.innerText();
    expect(gap).toMatch(/^\d+ ms later$/);
    await late.dispatchEvent("pointerdown", { button: 0 });
    expect(await delta.innerText()).toBe(gap);
    expect(await winner.innerText()).toBe("Juniper buzzed first");
    await part("reset").click();
    await winner.waitFor({ state: "detached" });
    expect(await part("status").innerText()).toBe("Ready to buzz");
    await late.click();
    expect(await winner.innerText()).toBe("Clover buzzed first");
  } finally {
    await browser.close();
    await server.close();
  }
}, 60_000);
