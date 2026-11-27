import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import type { Browser, JSHandle, Page } from "playwright-core";
import type { PhoneAgent } from "@lmthing/ui/kit";
import { createServer, type ViteDevServer } from "vite";
import { galleryConfig, launchChrome } from "../../../../scripts/look";

let server: ViteDevServer, browser: Browser, page: Page;
const route = "/agent-host-fixture";
const fixture = new URL("./agent-host.fixture.tsx", import.meta.url).pathname;

beforeAll(async () => {
  server = await createServer({
    ...galleryConfig(0),
    plugins: [
      {
        name: "agent-host-fixture",
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
  browser = await launchChrome();
  page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.addInitScript("globalThis.process ??= { env: {} }; globalThis.__name = (fn) => fn");
}, 60_000);

beforeEach(async () => {
  await page.goto(new URL(route, server.resolvedUrls!.local[0]).href, { waitUntil: "commit" });
});

afterAll(async () => {
  await browser?.close();
  await server?.close();
});

const click = (name: string) => page.getByRole("button", { name, exact: true }).click();
const hook = () => page.evaluateHandle(() => window.__lmthingUI!);

async function publish(screen: "main" | "second") {
  await click(`Publish ${screen}`);
  await page.waitForFunction((id) => window.__lmthingUI?.read().startsWith(`screen ${id}\n`), screen);
  return hook();
}

async function expectRevoked(handle: JSHandle<PhoneAgent>) {
  expect(await handle.evaluate((agent) => agent.read())).toBe("");
  expect(await handle.evaluate((agent) => agent.log())).toEqual([]);
  expect(await handle.evaluate((agent) => agent.act({ address: "open", action: "press" }))).toEqual({
    ok: false,
    code: "not_mounted",
    at: 0,
  });
  await handle.evaluate((agent) => agent.reset());
  await handle.dispose();
}

it("does not publish from either an unselected interactive phone or an inert preview", async () => {
  await page.getByTestId("main/open/root").waitFor();
  const unselected = await page.evaluate(() => window.__lmthingUI?.read());
  await click("Mount preview");
  await page.getByTestId("preview/open/root").waitFor();
  expect([unselected, await page.evaluate(() => window.__lmthingUI?.read())]).toEqual([undefined, undefined]);
});

it("lets the host explicitly expose an inert preview for reading", async () => {
  await click("Mount preview");
  await click("Read preview");
  await page.waitForFunction(() => window.__lmthingUI?.read().startsWith("screen preview\n"));
  expect(await page.evaluate(() => window.__lmthingUI!.act({ address: "open", action: "press" }))).toEqual({
    ok: false,
    code: "not_interactive",
    at: 0,
  });
  expect(await page.getByRole("button", { name: "Open preview", exact: true }).isDisabled()).toBe(true);
});

it("hands off between mounted phones and does not let either inert mounts or old cleanup win", async () => {
  const main = await publish("main");
  await click("Mount preview");
  await page.getByTestId("preview/open/root").waitFor();
  expect(await main.evaluate((agent) => agent === window.__lmthingUI)).toBe(true);
  const second = await publish("second");
  await page.getByTestId("main/open/root").waitFor();
  await expectRevoked(main);
  await click("Dispose main");
  await page.getByTestId("main/open/root").waitFor({ state: "detached" });
  expect(await second.evaluate((agent) => agent === window.__lmthingUI)).toBe(true);
  expect(await second.evaluate((agent) => agent.act({ address: "open", action: "press" }).ok)).toBe(true);
  await expect.poll(() => page.locator("output").textContent()).toBe("second/open");
  await click("Leave second route");
  await page.waitForFunction(() => window.__lmthingUI === undefined);
  await expectRevoked(second);
});

it("does not restore a superseded publication when the newer route is disposed", async () => {
  const main = await publish("main");
  const second = await publish("second");
  await click("Leave second route");
  await page.getByTestId("second/open/root").waitFor({ state: "detached" });
  await page.getByTestId("main/open/root").waitFor();
  expect(await page.evaluate(() => window.__lmthingUI)).toBeUndefined();
  await expectRevoked(main);
  await expectRevoked(second);
});

it("reads live human edits but rejects both acts and reset in read-only mode", async () => {
  const writable = await publish("second");
  const note = page.getByRole("textbox", { name: "Note second", exact: true });
  await note.fill("Human note");
  await click("Toggle read only");
  await page.waitForFunction(
    (previous) => Boolean(window.__lmthingUI && window.__lmthingUI !== previous),
    writable,
  );
  await expectRevoked(writable);
  expect(
    await page.evaluate(() => {
      const agent = window.__lmthingUI!;
      const edit = { address: "note/field", action: "type", value: "Agent note" };
      agent.reset();
      return { read: agent.read(), act: agent.act(edit), dryRun: agent.act(edit, { dryRun: true }) };
    }),
  ).toEqual({
    read: expect.stringContaining("Human note"),
    act: { ok: false, code: "not_interactive", at: 0 },
    dryRun: { ok: false, code: "not_interactive", at: 0 },
  });
  expect(await note.inputValue()).toBe("Human note");
  await click("Open second");
  await expect.poll(() => page.locator("output").textContent()).toBe("second/open");
  await click("Toggle read only");
  await page.waitForFunction(
    () => window.__lmthingUI?.act({ address: "open", action: "press" }, { dryRun: true }).ok,
  );
  expect(await page.evaluate(() => window.__lmthingUI!.act({ address: "open", action: "press" }).ok)).toBe(
    true,
  );
  await expect.poll(() => page.locator("output").textContent()).toBe("second/open,second/open");
});
