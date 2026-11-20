// The OpenRouter tier against a mocked openrouter.ai: paste a key, build, fall back on a 429, sign-in return.
// No real key or request leaves the machine; every openrouter.ai call is answered by page.route.
import { base, expect, open, recordedData, shots, type Browser } from "./check-lib";

type Page = Awaited<ReturnType<typeof open>>;
const fakeKey = `sk-or-v1-${"0".repeat(40)}check`;
const free = { prompt: "0", completion: "0" };
const listed = [
  {
    id: "check/strict:free",
    name: "Check Strict",
    pricing: free,
    supported_parameters: ["structured_outputs"],
  },
  { id: "check/plain:free", name: "Check Plain", pricing: free, supported_parameters: [] },
].map((m) => ({ ...m, context_length: 32000, architecture: { output_modalities: ["text"] } }));
const recorded = recordedData.screens.find((s) => s.pack === null && s.screen.components.length >= 4)!;

function sse(text: string) {
  const pieces = text.match(/[\s\S]{1,60}/g) ?? [];
  const events = pieces.map(
    (content) => `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`,
  );
  return [": OPENROUTER PROCESSING\n\n", ...events, "data: [DONE]\n\n"].join("");
}

/** Answers the model list and chat; `chat` decides each chat reply and sees the request. */
async function mock(page: Page, chat: (body: string, auth: string) => { status: number; body: string }) {
  await page.route("https://openrouter.ai/api/v1/models", (r) =>
    r.fulfill({ json: { data: listed }, headers: { "access-control-allow-origin": "*" } }),
  );
  await page.route("https://openrouter.ai/api/v1/chat/completions", (r) => {
    const reply = chat(r.request().postData() ?? "", r.request().headers()["authorization"] ?? "");
    return r.fulfill({
      ...reply,
      headers: { "access-control-allow-origin": "*", "content-type": "text/event-stream" },
    });
  });
}

async function connectAndBuild(page: Page) {
  await page.goto(`${base}#try`, { waitUntil: "networkidle" });
  await page.getByRole("radio", { name: /3 OpenRouter/ }).click();
  await page.getByLabel("Paste an OpenRouter key").fill(fakeKey);
  await page.getByRole("button", { name: "Use key" }).click();
  await page.waitForSelector("select[aria-label='Free model'] option[value='check/strict:free']", {
    state: "attached",
  });
  await page.getByRole("button", { name: "Build" }).click();
}

async function checkRun(browser: Browser, width: number) {
  const page = await open(browser, width);
  let sent = { body: "", auth: "" };
  await mock(
    page,
    (body, auth) => (
      (sent = { body, auth }),
      { status: 200, body: sse(JSON.stringify({ lines: recorded.screen.components })) }
    ),
  );
  await connectAndBuild(page);
  await page.waitForFunction(() => document.querySelectorAll(".try .stream .line-in").length >= 3, null, {
    timeout: 30000,
  });
  await page.waitForTimeout(1500);
  const running = (await page.locator(".running").textContent()) ?? "";
  expect(
    running.includes("OpenRouter") && running.includes("Check Strict"),
    `openrouter tier is running: ${running}`,
  );
  expect(sent.auth === `Bearer ${fakeKey}`, "openrouter: the pasted key is the bearer token");
  expect(
    /"model":"check\/strict:free"/.test(sent.body) && /"json_schema"/.test(sent.body),
    "openrouter: strict schema request",
  );
  const parts = await page.locator(".try [data-testid^='tryit/']").count();
  expect(parts >= 3, `openrouter run drew ${parts} addressed parts`);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
    `openrouter: no horizontal scroll at ${width}px`,
  );
  await page.locator("#try").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${shots}/try-openrouter-${width}.png` });
  await page.close();
}

async function checkFallback(browser: Browser) {
  const page = await open(browser, 1280);
  await mock(page, () => ({
    status: 429,
    body: JSON.stringify({ error: { message: "Rate limit exceeded", code: 429 } }),
  }));
  await connectAndBuild(page);
  await page.waitForFunction(
    () => /recorded replay is shown/.test(document.querySelector(".try .status")?.textContent ?? ""),
    null,
    { timeout: 30000 },
  );
  const status = (await page.locator(".try .status").textContent()) ?? "";
  expect(/quota/.test(status), `openrouter 429 explains the quota: ${status}`);
  expect(
    ((await page.locator(".running").textContent()) ?? "").includes("Recorded replay"),
    "openrouter failure falls back to replay",
  );
  await page.close();
}

async function checkReturn(browser: Browser) {
  const page = await open(
    browser,
    1280,
    `sessionStorage.getItem("lmthing-openrouter-verifier") ?? sessionStorage.setItem("lmthing-openrouter-verifier", "check-verifier")`,
  );
  let exchanged = "";
  await page.route(
    "https://openrouter.ai/api/v1/auth/keys",
    (r) => (
      (exchanged = r.request().postData() ?? ""),
      r.fulfill({ json: { key: fakeKey }, headers: { "access-control-allow-origin": "*" } })
    ),
  );
  await mock(page, () => ({ status: 500, body: "{}" }));
  await page.goto(`${base}?code=check-code`, { waitUntil: "networkidle" });
  expect(
    page.url().endsWith("#try") && !page.url().includes("code="),
    `sign-in return cleans the address: ${page.url()}`,
  );
  expect(
    /"code":"check-code"/.test(exchanged) && /"code_verifier":"check-verifier"/.test(exchanged),
    "sign-in return trades code and verifier",
  );
  await page.waitForFunction(
    () => /Connected to OpenRouter/.test(document.querySelector(".try .status")?.textContent ?? ""),
    null,
    { timeout: 30000 },
  );
  expect(
    (await page.locator(".orkey code").textContent())?.endsWith("heck") ?? false,
    "sign-in return shows the masked key",
  );
  await page.close();
}

export async function checkOpenRouter(browser: Browser) {
  for (const width of [1280, 390]) await checkRun(browser, width);
  await checkFallback(browser);
  await checkReturn(browser);
}
