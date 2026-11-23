import { expect, it } from "vitest";
import { createServer } from "vite";
import { galleryConfig, launchChrome } from "../../../../../scripts/look";

const route = "/card-deck-test";
const fixture = new URL("./CardDeck.fixture.tsx", import.meta.url).pathname;

it("draws two separate fans and requires confirmation to restore the deck", async () => {
  const server = await createServer({
    ...galleryConfig(0),
    plugins: [
      {
        name: "card-deck-test",
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
    const text = async (name: string) => (await part(name).innerText()).replace(/\s+/g, " ").trim();
    const draw = part("draw");
    const reshuffle = part("reshuffle");
    const faces = () => Promise.all([1, 2, 3].map((n) => part(`card_${n}`).innerText()));
    await draw.click();
    const first = await faces();
    expect(await text("remaining")).toBe("Draw pile: 3");
    await draw.click();
    const second = await faces();
    expect(new Set([...first, ...second]).size).toBe(6);
    expect(await text("discard")).toBe("Discard pile: 6");
    expect(await part("root").getByRole("status").innerText()).toBe("The draw pile is empty");
    await draw.waitFor({ state: "detached" });
    await reshuffle.click();
    await page.getByTestId("home/confirm/cancel").click();
    expect(await faces()).toEqual(second);
    await reshuffle.click();
    await page.getByTestId("home/confirm/confirm").click();
    expect(await text("remaining")).toBe("Draw pile: 6");
    expect(await part("card").innerText()).toBe("No cards drawn yet");
    await reshuffle.waitFor({ state: "detached" });
  } finally {
    await browser.close();
    await server.close();
  }
}, 60_000);
