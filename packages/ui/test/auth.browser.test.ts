import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import type { Browser, Page } from "playwright-core";
import { createServer, type ViteDevServer } from "vite";
import { launchChrome } from "../scripts";
import { galleryConfig } from "../scripts/look";

let server: ViteDevServer, browser: Browser, page: Page;
const errors: string[] = [];
beforeAll(async () => {
  server = await createServer({ ...galleryConfig(0), root: new URL(".", import.meta.url).pathname });
  await server.listen();
  browser = await launchChrome();
  page = await browser.newPage({ viewport: { width: 390, height: 800 } });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript("globalThis.__name = (fn) => fn;");
}, 60000);
beforeEach(async () => {
  errors.length = 0;
  await page.goto(`${server.resolvedUrls!.local[0]}auth.html`, { waitUntil: "networkidle" });
  await page.getByRole("textbox", { name: "Password", exact: true }).waitFor();
  await page.waitForFunction(() => Boolean(window.__lmthingUI));
}, 30000);
afterAll(async () => {
  await browser?.close();
  await server?.close();
});

it("reveals and re-masks the same private password without exposing it to the agent", async () => {
  const input = page.getByRole("textbox", { name: "Password", exact: true });
  const show = page.getByRole("button", { name: "Show password" });
  expect(await input.getAttribute("type")).toBe("password");
  await input.fill("preview-only");
  expect(await input.inputValue()).toBe("preview-only");
  await show.press("Enter");
  expect(await input.getAttribute("type")).toBe("text");
  expect(await input.inputValue()).toBe("preview-only");
  const result = await page.evaluate(() => ({
    read: window.__lmthingUI!.read(),
    step: window.__lmthingUI!.act({ address: "f3/field", action: "type", value: "preview" }),
  }));
  expect(result.read).not.toContain("preview-only");
  expect(result.step.ok).toBe(false);
  await page.getByRole("button", { name: "Hide password" }).click();
  expect(await input.getAttribute("type")).toBe("password");
  expect(errors).toEqual([]);
});

it("enters a verification code in one accessible control without storing the digits", async () => {
  const email = page.getByRole("textbox", { name: "Email address" });
  expect(await email.getAttribute("inputmode")).toBe("email");
  await email.pressSequentially("name@example.test");
  expect(await email.inputValue()).toBe("name@example.test");
  await page.getByRole("button", { name: "Create account" }).click();
  const input = page.getByRole("textbox", { name: "Verification code" });
  await input.waitFor();
  expect(await input.getAttribute("inputmode")).toBe("numeric");
  const cells = page.locator("[data-kit-code-cell]");
  expect(await cells.count()).toBe(8);
  await input.fill("a0123-456789");
  expect(await input.inputValue()).toBe("01234567");
  expect(await cells.allTextContents()).toEqual(["0", "1", "2", "3", "4", "5", "6", "7"]);
  await input.press("End");
  await input.press("Backspace");
  expect(await input.inputValue()).toBe("0123456");
  expect(await cells.last().textContent()).toBe("");
  expect(await page.evaluate(() => window.__lmthingUI!.read())).not.toContain("0123456");
  expect(errors).toEqual([]);
});

it("follows the provider's preview destination and mounts a fresh masked field", async () => {
  const input = page.getByRole("textbox", { name: "Password", exact: true });
  await input.fill("preview-only");
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await page.getByTestId("signin_credentials/f2/field").waitFor();
  expect(await input.inputValue()).toBe("");
  expect(await input.getAttribute("type")).toBe("password");
  expect(errors).toEqual([]);
});
