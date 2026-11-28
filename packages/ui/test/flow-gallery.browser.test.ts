import { afterAll, afterEach, beforeAll, beforeEach, expect, test } from "vitest";
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
const branches = new Set([
  "Tue at 10:00",
  "Reschedule",
  "Cancel booking",
  "Approve",
  "Forgot password?",
  "Book open spot",
  "Join waitlist if full",
  "See spot offer",
  "Leave waitlist",
  "Accept proposal",
  "Decline proposal",
]);
const at = (key: string) => page.locator(`[data-flow-player="${key}"]`).waitFor();

beforeAll(async () => {
  server = await createServer(galleryConfig(0));
  await server.listen();
  browser = await launchChrome();
}, 90_000);

beforeEach(async () => {
  errors.length = 0;
  page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.setDefaultTimeout(12_000);
  page.setDefaultNavigationTimeout(30_000);
  page.on("pageerror", (e) => errors.push(e.message));
});

afterEach(async () => {
  await page?.close();
  expect(errors).toEqual([]);
});

afterAll(async () => {
  await browser?.close();
  await server?.close();
});

const cases = [
  ["book_slot", ["Tue at 10:00", "Confirm booking", "Reschedule", "Confirm change"], "guest/rescheduled"],
  ["book_slot", ["Tue at 10:00", "Confirm booking", "Cancel booking", "Release time"], "guest/cancelled"],
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
  [
    "report_issue",
    [
      "Review report",
      "Review report",
      "Send report",
      "Open resolver's report",
      "Start work",
      "Resolve and notify",
    ],
    "reporter/resolved",
  ],
  ["check_in", ["Show pass", "Review matched pass", "Mark present"], "attendee/arrived"],
  ["pay_receipt", ["Confirm payment", "Check payment status", "View receipt"], "payer/receipt"],
  [
    "signup_onboard",
    ["Create account", "Preview verified setup", "Skip for now", "Make a first list"],
    "member/ready",
  ],
  ["login_recovery", ["Log in", "Verify and log in"], "member/signed_in"],
  [
    "login_recovery",
    [
      "Forgot password?",
      "Request reset code",
      "Verify reset code",
      "Reset password",
      "Log in",
      "Verify and log in",
    ],
    "member/signed_in",
  ],
  ["class_waitlist", ["Book open spot", "Confirm class"], "member/booked"],
  [
    "class_waitlist",
    ["Join waitlist if full", "See spot offer", "Review spot", "Confirm class"],
    "member/booked",
  ],
  ["class_waitlist", ["Join waitlist if full", "Leave waitlist", "Confirm leave"], "member/left"],
  [
    "assign_work_order",
    [
      "Send request",
      "Assign work order",
      "Acknowledge assignment",
      "Review work outcome",
      "Submit outcome",
      "Close and notify",
    ],
    "requester/closed",
  ],
  [
    "lead_to_client",
    [
      "Send inquiry",
      "Open inquiry queue",
      "Review inquiry",
      "Send proposal",
      "Accept proposal",
      "Send acceptance",
      "Create client",
    ],
    "owner/client",
  ],
  [
    "lead_to_client",
    [
      "Send inquiry",
      "Open inquiry queue",
      "Review inquiry",
      "Send proposal",
      "Decline proposal",
      "Confirm decline",
    ],
    "prospect/declined",
  ],
] as const;

test.each(cases)("plays %s through actual kit controls (%j)", async (id, actions, end) => {
  await page.goto(`${base()}?flows=${id}`);
  for (const action of actions) {
    if (action === "Verify reset code")
      await phone().getByLabel("Reset code", { exact: true }).fill("000000");
    if (action === "Verify and log in") await phone().getByLabel("Verification code").fill("000000");
    await (branches.has(action) ? choice(action) : button(action)).click();
  }
  await at(end);
  await playback("Play again").waitFor();
  expect(await button("Play again").count()).toBe(0);
  expect(errors).toEqual([]);
});

test("tracks the same order through to arrival", async () => {
  await page.goto(`${base()}?flows=order_track`);
  await at("customer/review");
  await button("Place order").click();
  await at("customer/preparing");
  await button("View delivery").click();
  await at("customer/in_transit");
  await phone().getByText("OR-118", { exact: true }).waitFor();
  await button("View arrival").click();
  await at("customer/delivered");
  await phone().getByText("OR-118", { exact: true }).waitFor();
  await playback("Play again").waitFor();
});

test("an expired offer has no booking affordance and can return to the sample", async () => {
  await page.goto(`${base()}?flows=class_waitlist`);
  await choice("Join waitlist if full").click();
  await choice("See spot offer").click();
  await at("member/offer");
  await page.getByText("Inspect steps and states", { exact: true }).click();
  await playback("Error").click();
  await page.locator("[data-flow-state=error]").waitFor();
  expect(await button("Review spot").count()).toBe(0);
  await phone().getByText("This offer expired. You have not been booked.", { exact: true }).waitFor();
  await playback("Return to playback").click();
  await button("Review spot").click();
  await at("member/review");
});

test("login recovery keeps demo credentials local and shows waiting and expired-code states", async () => {
  await page.goto(`${base()}?flows=login_recovery`);
  await phone().getByLabel("Email address", { exact: true }).fill("not-the-sample@example.test");
  await phone().getByLabel("Password", { exact: true }).fill("made-up-only");
  await choice("Forgot password?").click();
  await at("member/recover");
  expect(await phone().getByLabel("Email address", { exact: true }).inputValue()).toBe("");
  await button("Request reset code").click();
  await at("member/recovery_verify");
  await phone().getByText("Enter six sample digits.", { exact: true }).waitFor();
  await button("Verify reset code").click();
  await page.locator("[data-flow-state=error]").waitFor();
  await phone().getByText("Enter six sample digits.", { exact: true }).waitFor();
  await playback("Return to playback").click();
  expect(await phone().evaluate((node) => document.activeElement === node)).toBe(true);
  await page.keyboard.press("Tab");
  expect(
    await phone()
      .getByLabel("Reset code", { exact: true })
      .evaluate((node) => document.activeElement === node),
  ).toBe(true);
  await page.locator("details > summary").filter({ hasText: "Inspect steps and states" }).press("Enter");
  await page.getByText("Needs an outside service", { exact: true }).waitFor();
  await playback("Waiting").click();
  await phone().getByText("A real service would send a code if the address matches an account.").waitFor();
  await playback("Error").click();
  await page.getByText(/play again to request a new code/).waitFor();
  await phone()
    .getByText("That code didn’t work or has expired. Request a new code and try again.")
    .waitFor();
  expect(await button("Verify reset code").count()).toBe(0);
  await playback("Reset your password").click();
  await at("member/recover");
  expect(await page.evaluate(() => window.__lmthingUI)).toBeUndefined();
  await button("Request reset code").click();
  await page.locator('[data-flow-player="member/recover"][data-flow-state="inspect"]').waitFor();
  await playback("Return to playback").click();
  await at("member/recovery_verify");
  await playback("Error").click();
  await playback("Play again").click();
  await choice("Forgot password?").click();
  await button("Request reset code").click();
  await phone().getByLabel("Reset code", { exact: true }).fill("000000");
  await button("Verify reset code").click();
  await phone().getByLabel("New password", { exact: true }).fill("another-made-up-value");
  await button("Reset password").click();
  await at("member/login_after_reset");
  expect(await phone().getByLabel("Password", { exact: true }).inputValue()).toBe("");
  await button("Log in").click();
  expect(await phone().getByLabel("Verification code").inputValue()).toBe("");
  await phone().getByLabel("Verification code").fill("11111");
  await button("Verify and log in").click();
  await page.locator("[data-flow-state=error]").waitFor();
  await playback("Return to playback").click();
  await phone().getByLabel("Verification code").fill("111111");
  await button("Verify and log in").click();
  await phone().getByText("Class schedule", { exact: true }).waitFor();
  await phone().getByText("Tuesday pottery", { exact: true }).waitFor();
  expect(await phone().getByText("not-the-sample@example.test", { exact: true }).count()).toBe(0);
});

test("the agenda opens the full session's details without booking or linking the unlinked row", async () => {
  await page.goto(`${base()}?nav-shell=booking_agenda`);
  const agenda = page.locator("[data-navigation-shell=booking_agenda]");
  await agenda.getByText("Booked", { exact: true }).waitFor();
  expect(await agenda.getByRole("link", { name: /Winter watering/ }).count()).toBe(0);
  await agenda.getByRole("link", { name: /Plant cuttings exchange/ }).click();
  const details = page.locator("[data-navigation-shell=cuttings_waitlist]");
  await details.getByText("Full", { exact: true }).waitFor();
  await details.getByText("This preview does not reserve a place.", { exact: true }).waitFor();
  expect(errors).toEqual([]);
});

test("opens the flow launcher from the gallery", async () => {
  await page.goto(base(), { waitUntil: "commit" });
  await page.getByRole("link", { name: "Flow templates", exact: true }).click({ timeout: 75000 });
  await page.getByRole("link", { name: /Book a slot/ }).waitFor();
  await page.getByRole("link", { name: /Request and approve/ }).click();
  await at("requester/draft");
}, 120000);

test("inspects an error and carries a typed reason across the hand-off", async () => {
  await page.goto(`${base()}?flows=request_approve`);
  await at("requester/draft");
  await page.getByText("Inspect steps and states", { exact: true }).click();
  await page.getByRole("button", { name: "Error", exact: true }).click();
  await page.locator("[data-flow-state=error]").waitFor();
  expect(await page.evaluate(() => window.__lmthingUI === undefined)).toBe(true);
  await playback("Return to playback").click();
  await page.waitForFunction(() => Boolean(window.__lmthingUI));
  for (const action of ["Send request", "Open for review"]) await button(action).click();
  await choice("Decline").click();
  await at("approver/reason");
  const reason = phone().getByRole("textbox");
  await reason.fill("");
  await button("Send decision").click();
  await at("approver/reason");
  await phone().getByText("Enter a reason so the requester knows what to change.", { exact: true }).waitFor();
  expect(await reason.inputValue()).toBe("");
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
