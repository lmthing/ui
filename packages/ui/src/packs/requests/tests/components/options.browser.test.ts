import { afterAll, beforeAll, expect, it } from "vitest";
import type { Browser, Page } from "playwright-core";
import { createServer, type ViteDevServer } from "vite";
import { components } from "@lmthing/ui/catalog";
import { launchChrome } from "../../../../../scripts";
import { galleryConfig } from "../../../../../scripts/look";

let server: ViteDevServer, browser: Browser, page: Page;
const route = "/requests-options-test";
const fixture = new URL("./options.fixture.tsx", import.meta.url).pathname;

beforeAll(async () => {
  server = await createServer({
    ...galleryConfig(0),
    plugins: [
      {
        name: "requests-options-test",
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

afterAll(async () => {
  await browser?.close();
  await server?.close();
});

it("uses each opt-in control through the mounted phone screen", async () => {
  await page.goto(new URL(route, server.resolvedUrls!.local[0]).href);
  const completed = page.getByRole("radio", { name: "Show completed" });
  const breached = page.getByTestId("desk/queue/r1/sla_breached");
  expect(await breached.innerText()).toBe("SLA breached");
  expect(await page.getByTestId("desk/queue/r2/root").count()).toBe(0);
  await completed.click();
  await breached.waitFor({ state: "detached" });
  await page.getByRole("link", { name: "Loose kennel gate" }).click();
  expect(await page.getByTestId("desk/thread/r1/file").innerText()).toBe("Attached file");
  await page.getByRole("button", { name: "Browse saved replies" }).click();
  const finish = page.getByRole("button", { name: "Finish work" });
  const sign = page.getByRole("checkbox", { name: "Sign off on work" });
  expect(await finish.isDisabled()).toBe(true);
  await sign.click();
  expect(await sign.getAttribute("aria-checked")).toBe("true");
  expect(await finish.isEnabled()).toBe(true);
  await sign.click();
  expect(await finish.isDisabled()).toBe(true);
  await sign.click();
  await finish.click();
  expect(await page.locator("#events").textContent()).toBe("kennel_gate\nsaved_replies\nfinish");
});

it("filters, previews and inserts a full reply through the mounted phone screen", async () => {
  await page.goto(new URL(route, server.resolvedUrls!.local[0]).href);
  const [photo, update] = components.CannedReplies.examples[0]!.templates;
  const draft = page.getByRole("textbox", { name: "Write a reply" });
  const preview = page.getByTestId("desk/replies/r1/root");
  const body = page.getByTestId("desk/replies/r1/preview");
  await draft.fill("An earlier draft");
  await preview.click();
  await body.waitFor({ state: "visible", timeout: 3000 });
  expect(await preview.getAttribute("aria-expanded")).toBe("true");
  expect(await body.innerText()).toBe(photo!.body);
  expect(await draft.inputValue()).toBe("An earlier draft");
  await preview.click();
  await body.waitFor({ state: "detached", timeout: 3000 });
  await page.getByRole("radio", { name: "Scheduling" }).click();
  expect(await page.getByTestId("desk/replies/empty").innerText()).toBe("No saved replies in this category");
  await page.getByRole("radio", { name: "Update" }).click();
  expect(await preview.count()).toBe(0);
  await page.getByTestId("desk/replies/r2/insert").click();
  expect(await draft.inputValue()).toBe(update!.body);
  expect(await page.getByRole("button", { name: "Send reply" }).isEnabled()).toBe(true);
  expect(await page.locator("#events").textContent()).toBe("");
});

it("retries a failed reply, retains the history and opens a fresh composer after acknowledgement", async () => {
  await page.goto(new URL(`${route}?retry`, server.resolvedUrls!.local[0]).href);
  const original = components.RequestThread.examples[0]!.draft!;
  const retry = page.getByRole("button", { name: "Retry reply" });
  const draft = page.getByRole("textbox", { name: "Write a reply" });
  const send = page.getByRole("button", { name: "Send reply" });
  expect(await page.getByTestId("desk/thread/field").innerText()).toBe(original);
  await page.getByText("Assigned to Ella").waitFor({ state: "visible" });
  await retry.click();
  await page.getByText("Reply sent").waitFor({ state: "visible" });
  expect(await page.getByTestId("desk/thread/r5/text").innerText()).toBe(original);
  expect(await retry.count()).toBe(0);
  expect(await draft.inputValue()).toBe("");
  expect(await send.isDisabled()).toBe(true);
  await draft.fill("I will confirm the arrival time.");
  await send.click();
  expect(await page.getByTestId("desk/thread/r6/text").innerText()).toBe("I will confirm the arrival time.");
});
