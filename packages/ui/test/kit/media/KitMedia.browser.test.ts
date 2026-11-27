import { expect, it } from "vitest";
import { createServer } from "vite";
import { galleryConfig } from "../../../scripts/look";
import { launchChrome } from "../../../scripts";

const route = "/kit-media-test";
const moduleId = "virtual:kit-media-fixture";
const renderPath = new URL("../../render.tsx", import.meta.url).pathname;
const fixture = `
  import { createElement as h } from "react";
  import { createRoot } from "react-dom/client";
  import { TamaguiProvider } from "tamagui";
  import { components } from "@lmthing/ui/catalog";
  import { PhoneScreen, publishBrowserAgent, renderers } from "@lmthing/ui/kit";
  import { config } from ${JSON.stringify(renderPath)};

  const screen = { id: "home", components: [{
    c: "Player", id: "p1", mode: "video", media: "lib:fixture", photo: "lib:poster",
    title: "Local clip", seconds: 30, speed: 1.5, loop: true,
  }] };
  const theme = { preset: "calm", mode: "light", accent: "moss" };
  const media = {
    open(_reference, { video, onPlaying }) {
      const element = document.createElement(video ? "video" : "audio");
      return { element, play: () => onPlaying(true), pause: () => onPlaying(false),
        seek() {}, dispose() { element.remove(); } };
    },
  };
  createRoot(document.getElementById("root")).render(h(
    TamaguiProvider, { config, defaultTheme: "kit_calm_light_moss" },
    h(PhoneScreen, { screen, theme, media, defs: components, renderers, interactive: true,
      onReady: publishBrowserAgent }),
  ));
`;

it("keeps the toolbar usable over the mounted video and applies supplied playback settings", async () => {
  const server = await createServer({
    ...galleryConfig(0),
    plugins: [
      {
        name: "kit-media-fixture",
        resolveId: (id) => (id === moduleId ? id : undefined),
        load: (id) => (id === moduleId ? fixture : undefined),
        configureServer({ middlewares }) {
          middlewares.use(route, (_request, response) => {
            response.setHeader("Content-Type", "text/html");
            response.end(
              `<!doctype html><div id="root" style="width:390px"></div><script type="module" src="/@id/${moduleId}"></script>`,
            );
          });
        },
      },
    ],
  });
  try {
    await server.listen();
    const browser = await launchChrome();
    try {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await page.addInitScript("globalThis.process ??= { env: {} }; globalThis.__name = (fn) => fn");
      await page.goto(new URL(route, server.resolvedUrls!.local[0]).href);
      const video = page.locator("video");
      const play = page.getByTestId("home/p1/play");
      await video.waitFor();
      expect(await page.getByTestId("home/p1/artwork").count()).toBe(0);
      expect(await video.evaluate((node: HTMLVideoElement) => [node.playbackRate, node.loop])).toEqual([
        1.5,
        true,
      ]);
      const frame = (await video.boundingBox())!;
      const action = (await play.boundingBox())!;
      expect(action.y).toBeGreaterThan(frame.y);
      expect(action.y + action.height).toBeLessThanOrEqual(frame.y + frame.height);
      await page.waitForFunction(() => window.__lmthingUI?.read().includes("Paused"));
      await play.click();
      await page.getByRole("button", { name: "Pause" }).waitFor();
      expect(await page.evaluate(() => window.__lmthingUI!.read())).toContain("Playing");
      await play.click();
      await page.getByRole("button", { name: "Play" }).waitFor();
      expect(await page.evaluate(() => window.__lmthingUI!.read())).toContain("Paused");
    } finally {
      await browser.close();
    }
  } finally {
    await server.close();
  }
}, 60000);
