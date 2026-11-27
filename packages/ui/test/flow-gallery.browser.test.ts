import { afterAll, beforeAll, expect, test } from "vitest";
import type { Browser, Page } from "playwright-core";
import { createServer, type ViteDevServer } from "vite";
import { galleryConfig, launchChrome } from "../scripts/look";

let server: ViteDevServer;
let browser: Browser;
let page: Page;
const errors: string[] = [];
const base = () => server.resolvedUrls!.local[0]!;
const phone = () => page.locator("[data-flow-phone]");
const button = (name: string) => phone().getByRole("button", { name, exact: true });
const playback = (name: string) => page.getByRole("button", { name, exact: true });
const choice = (name: string) => phone().getByRole("link", { name, exact: true });
const branches = new Set(["Reschedule", "Cancel booking", "Approve"]);
const at = (key: string) => page.locator(`[data-flow-player="${key}"]`).waitFor();

beforeAll(async () => {
  server = await createServer(galleryConfig(0));
  await server.listen();
  browser = await launchChrome();
  page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.setDefaultTimeout(12_000);
  page.setDefaultNavigationTimeout(30_000);
  page.on("pageerror", (e) => errors.push(e.message));
}, 90_000);

afterAll(async () => {
  await browser?.close();
  await server?.close();
});

const cases = [
  ["book_slot", ["Review booking", "Confirm booking", "Reschedule", "Confirm change"], "guest/rescheduled"],
  ["book_slot", ["Review booking", "Confirm booking", "Cancel booking", "Release time"], "guest/cancelled"],
  [
    "invite_accept",
    ["Send invitation", "Open invitation", "Accept invitation", "Show joined status"],
    "inviter/joined",
  ],
  [
    "request_approve",
    ["Send request", "Open for review", "Approve", "Confirm approval"],
    "requester/approved",
  ],
  ["order_track", ["Place order", "View delivery", "View arrival"], "customer/delivered"],
  [
    "report_issue",
    ["Review report", "Continue", "Send report", "Start work", "Resolve and notify"],
    "reporter/resolved",
  ],
  ["check_in", ["Show pass", "Review arrival", "Mark present"], "attendee/arrived"],
  ["pay_receipt", ["Confirm payment", "Check payment", "View receipt"], "payer/receipt"],
  [
    "signup_onboard",
    ["Create account", "Continue after verifying", "Save goal", "Make a first list"],
    "member/ready",
  ],
] as const;

test.each(cases)("plays %s through actual kit controls (%j)", async (id, actions, end) => {
  await page.goto(`${base()}?flows=${id}`);
  for (const action of actions) await (branches.has(action) ? choice(action) : button(action)).click();
  await at(end);
  expect(await page.getByText("Journey complete", { exact: true }).count()).toBe(1);
  expect(errors).toEqual([]);
});

test("opens the launcher, inspects an error, and carries a typed reason across the hand-off", async () => {
  await page.goto(base());
  await page.getByRole("link", { name: "Flow templates", exact: true }).click();
  await page.getByRole("link", { name: /Book a slot/ }).waitFor();
  await page.getByRole("link", { name: /Request and approve/ }).click();
  await at("requester/draft");
  await page.getByText("Inspect steps and states", { exact: true }).click();
  await page.getByRole("button", { name: "Error", exact: true }).click();
  await page.locator("[data-flow-state=error]").waitFor();
  await playback("Return to playback").click();
  for (const action of ["Send request", "Open for review"]) await button(action).click();
  await choice("Decline").click();
  await at("approver/reason");
  const reason = phone().getByRole("textbox");
  await reason.fill("");
  await button("Send decision").click();
  await page.locator("[data-flow-player='approver/reason'][data-flow-state=error]").waitFor();
  expect(await phone().getByRole("textbox").inputValue()).toBe("");
  await playback("Return to playback").click();
  await reason.fill("No permit on file");
  await button("Send decision").click();
  await at("requester/rejected");
  expect(await phone().getByText("No permit on file", { exact: true }).count()).toBe(1);
  expect(await button("Play again").count()).toBe(0);
  await playback("Play again").click();
  await at("requester/draft");
  await page.getByRole("button", { name: "Shift", exact: true }).click();
  await at("requester/draft");
  expect(await phone().getByRole("textbox").inputValue()).toBe("Shift swap");
  expect(errors).toEqual([]);
});
