import { expect, it } from "vitest";
import { createServer } from "vite";
import type { Page } from "playwright-core";
import { galleryConfig, launchChrome } from "../../../../../scripts/look";

const route = "/pass-reveal-test";
const fixture = new URL("./PassReveal.fixture.tsx", import.meta.url).pathname;
const parts = (page: Page) => (name: string) => page.getByTestId(`home/p1/${name}`);

async function tapRound(page: Page) {
  const part = parts(page);
  for (const [name, role] of [
    ["Anna", "Seed keeper"],
    ["Ben", "Rain maker"],
    ["Sam", "Trail finder"],
  ]) {
    expect(await part("player").innerText()).toBe(name);
    expect(await part("role").count()).toBe(0);
    await part("reveal").click();
    expect(await part("role").innerText()).toBe(role);
    await part("hide").click();
    expect(await part("role").count()).toBe(0);
    expect(await part("detail").count()).toBe(0);
  }
  expect(await part("status").innerText()).toBe("Round ready");
  await part("restart").click();
  await page.getByTestId("home/confirm/confirm").click();
  expect(await part("player").innerText()).toBe("Anna");
  expect(await part("role").count()).toBe(0);
}

async function holdRound(page: Page) {
  const part = parts(page);
  const reveal = part("reveal");
  await reveal.hover();
  await page.mouse.down();
  expect(await part("role").innerText()).toBe("Seed keeper");
  await page.mouse.up();
  expect(await part("player").innerText()).toBe("Ben");
  expect(await part("role").count()).toBe(0);
  await reveal.focus();
  await page.keyboard.down(" ");
  expect(await part("role").innerText()).toBe("Rain maker");
  await page.keyboard.press("Escape");
  await page.keyboard.up(" ");
  expect(await part("player").innerText()).toBe("Sam");
  expect(await part("role").count()).toBe(0);
  await reveal.focus();
  await page.keyboard.down("Enter");
  expect(await part("role").innerText()).toBe("Trail finder");
  await page.keyboard.up("Enter");
  expect(await part("status").innerText()).toBe("Round ready");
  expect(await part("role").count()).toBe(0);
}

it("mounts a secret only on a tap or an active hold and veils it before the next seat", async () => {
  const server = await createServer({
    ...galleryConfig(0),
    plugins: [
      {
        name: "pass-reveal-test",
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
    const url = new URL(route, server.resolvedUrls!.local[0]).href;
    await page.goto(url);
    await tapRound(page);
    await page.goto(`${url}?hold`);
    await holdRound(page);
  } finally {
    await browser.close();
    await server.close();
  }
}, 60_000);
