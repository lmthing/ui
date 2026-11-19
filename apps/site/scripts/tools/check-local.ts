// Tier 2 (WebLLM) checks on software WebGPU; run with --webgpu or --webgpu-run.
import { launchChrome } from "../../../../packages/ui/scripts/look/launch-chrome";
import { base, expect, open, shots } from "./check-lib";

/** Tier 2 up to the download: WebGPU is found, the explicit button is offered, clicking it boots the worker. */
export async function checkLocalModel() {
  const flags = [
    "--enable-unsafe-webgpu",
    "--enable-features=Vulkan,WebGPU",
    "--use-angle=swiftshader",
    "--use-webgpu-adapter=swiftshader",
    "--ignore-gpu-blocklist",
  ];
  const gpuBrowser = await launchChrome({ args: flags });
  const page = await open(gpuBrowser, 1280);
  await page.goto(`${base}#try`, { waitUntil: "networkidle" });
  const button = page.getByRole("button", { name: /Download a ~1 GB model/ });
  await button.waitFor({ timeout: 10000 });
  expect(true, "tier 2: WebGPU adapter found, download offered only as an explicit button");
  await button.click();
  await page.waitForFunction(
    () =>
      /Fetching|Loading|Initiali|download|failed/i.test(document.querySelector(".status")?.textContent ?? ""),
    null,
    { timeout: 60000 },
  );
  expect(true, `tier 2: worker booted, status: ${await page.locator(".status").textContent()}`);
  await page.screenshot({ path: `${shots}/try-webllm-loading.png` });
  await gpuBrowser.close();
}

/** Tier 2 end to end with a small model on software WebGPU: slow, so it only runs with --webgpu-run. */
export async function checkLocalRun() {
  const flags = [
    "--enable-unsafe-webgpu",
    "--enable-features=Vulkan,WebGPU",
    "--use-angle=swiftshader",
    "--use-webgpu-adapter=swiftshader",
    "--ignore-gpu-blocklist",
  ];
  const gpuBrowser = await launchChrome({ args: flags });
  const page = await open(gpuBrowser, 1280);
  await page.goto(`${base}?webllm-model=Qwen2.5-0.5B-Instruct-q4f16_1-MLC#try`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Download a ~1 GB model/ }).click();
  await page.getByText("The local model is ready.").waitFor({ timeout: 20 * 60000 });
  await page.getByRole("button", { name: "Build" }).click();
  await page.waitForFunction(() => document.querySelectorAll(".try .stream .line-in").length >= 1, null, {
    timeout: 25 * 60000,
  });
  const running = await page.locator(".running").textContent();
  expect(running?.includes("WebLLM") ?? false, `tier 2 end to end: ${running}`);
  console.log(await page.locator(".try .stream").textContent());
  await page.screenshot({ path: `${shots}/try-webllm-run.png` });
  await gpuBrowser.close();
}
