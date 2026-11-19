import { launchChrome } from "../../../../packages/ui/scripts/look/launch-chrome";
for (const args of [
  [],
  [
    "--enable-unsafe-webgpu",
    "--enable-features=Vulkan,WebGPU",
    "--use-angle=swiftshader",
    "--use-webgpu-adapter=swiftshader",
    "--ignore-gpu-blocklist",
  ],
]) {
  const browser = await launchChrome({ args });
  const page = await browser.newPage();
  await page.goto("http://localhost:5199/");
  console.log(
    args.length,
    await page.evaluate(async () => {
      const g = (navigator as any).gpu;
      if (!g) return "no navigator.gpu";
      try {
        const a = await g.requestAdapter();
        return a ? "adapter ok" : "null adapter";
      } catch (e) {
        return String(e);
      }
    }),
  );
  await browser.close();
}
