import { expect, it } from "vitest";
import { createServer } from "vite";
import { galleryConfig, launchChrome } from "../../../../../scripts/look";

const route = "/life-counter-test";
const fixture = new URL("./LifeCounter.fixture.tsx", import.meta.url).pathname;

it("updates rotated pads and counter controls with pointer and keyboard, then confirms reset", async () => {
  const server = await createServer({
    ...galleryConfig(0),
    plugins: [
      {
        name: "life-counter-test",
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
    const part = (name: string) => page.getByTestId(`home/c1/${name}`);
    const fern = part("r1/total");
    const other = part("r2/total");
    const resource = part("r1/counter_1");
    const plus = part("r1/life").getByRole("button", { name: "Fern, Life, +1", exact: true });
    const reset = part("reset");
    expect(await part("r1/root").evaluate((node) => getComputedStyle(node).transform)).toBe(
      "matrix(-1, 0, 0, -1, 0, 0)",
    );
    await plus.press("Enter");
    await part("r1/life_minus_5").click();
    await part("r1/more_1").click();
    expect(await fern.innerText()).toBe("16");
    expect(await other.innerText()).toBe("18");
    expect(await resource.innerText()).toBe("Water: 4");
    await reset.click();
    await page.getByTestId("home/confirm/cancel").click();
    expect(await fern.innerText()).toBe("16");
    await reset.click();
    await page.getByTestId("home/confirm/confirm").click();
    expect(await fern.innerText()).toBe("20");
    expect(await resource.innerText()).toBe("Water: 3");
  } finally {
    await browser.close();
    await server.close();
  }
}, 60_000);
