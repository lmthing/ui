import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath, URL } from "node:url";
import { expect, it } from "vitest";
import { build, preview, type Manifest } from "vite";
import type { Page } from "playwright-core";
import { buildKit, bundleCheck } from "../scripts/build";
import { webResolve } from "../scripts/look";
import { launchChrome } from "../scripts";

const root = fileURLToPath(new URL("../", import.meta.url));
const app = `
  import { createElement as h } from "react";
  import { createRoot } from "react-dom/client";
  import { createTamagui, createTokens, TamaguiProvider } from "tamagui";
  import { components, createRegistry, hostActionPolicy } from "@lmthing/ui/catalog-browser";
  import { createAgentAccess, createInteractionStore, PhoneScreen } from "@lmthing/ui/kit/runtime";
  import { kitFonts, kitThemes, kitTokens } from "@lmthing/ui/kit/tamagui";
  import { renderers as core } from "@lmthing/ui/renderers/core";

  const themes = Object.fromEntries(
    Object.entries({ light: kitThemes.kit_calm_light_moss, ...kitThemes })
      .map(([name, roles]) => [name, { ...roles, color: roles.text, background: roles.bg }]),
  );
  const config = createTamagui({ tokens: createTokens(kitTokens), fonts: kitFonts, defaultFont: "humanist", themes });
  const root = createRoot(document.querySelector("#root"));
  const header = { id: "h1", c: "Header", title: "Queue" };
  const theme = { preset: "calm", mode: "light", accent: "moss" };
  const linkScreen = {
    id: "probe", components: [{ id: "b1", c: "Button", label: "Details", goto: "details" }],
  };
  function read(screen) {
    return createAgentAccess({ defs: components, current: () => screen, store: createInteractionStore() }).read();
  }
  const denial = { ...linkScreen, [hostActionPolicy]: { allowsLink: () => false } };
  document.body.dataset.linkPolicy = String(read(linkScreen).includes("→details") && !read(denial).includes("→details"));
  function show(renderers, entries) {
    root.render(h(TamaguiProvider, { config, defaultTheme: "kit_calm_light_moss" },
      h(PhoneScreen, { defs: components, renderers, theme, screen: { id: "home", components: entries } })));
  }
  show(core, [header]);
  document.querySelector("button").onclick = async () => {
    const { renderers } = await import("@lmthing/ui/renderers/booking");
    const schema = createRegistry({ packs: ["booking"] }).schema("Waitlist");
    const props = { position: 3, ahead: 2, joined: true };
    schema.parse(props);
    show({ ...core, ...renderers }, [header, { id: "w1", c: "Waitlist", ...props }]);
  };
`;

async function exerciseEntries(page: Page, url: string, bookingFile: string) {
  const packFiles: string[] = [];
  const errors: string[] = [];
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (path === `/${bookingFile}`) packFiles.push(path);
  });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
  });
  try {
    await page.goto(url);
    await page.getByText("Queue", { exact: true }).waitFor({ timeout: 10000 });
    expect(await page.locator("body").getAttribute("data-link-policy")).toBe("true");
    expect(packFiles).toEqual([]);
    await page.getByRole("button", { name: "Load pack" }).click();
    await page.getByTestId("home/w1/root").waitFor({ timeout: 10000 });
    expect(packFiles).toEqual([`/${bookingFile}`]);
    expect(errors).toEqual([]);
  } catch (cause) {
    throw new Error(`Published entry smoke failed. Browser errors: ${errors.join("; ") || "(none)"}`, {
      cause,
    });
  }
}

it("renders a core screen and then loads the requested pack using the published entries", async () => {
  await bundleCheck(false);
  await buildKit(false);
  const fixture = await mkdtemp(join(root, "dist", "entry-smoke-"));
  try {
    await writeFile(
      join(fixture, "index.html"),
      '<button>Load pack</button><div id="root"></div><script type="module" src="./app.js"></script>',
    );
    await writeFile(join(fixture, "app.js"), app);
    await build({
      root: fixture,
      configFile: false,
      logLevel: "error",
      resolve: { ...webResolve, conditions: webResolve.conditions.filter((name) => name !== "source") },
      define: { "process.env.TAMAGUI_TARGET": '"web"' },
      build: { manifest: true },
    });
    const manifest: Manifest = JSON.parse(await readFile(join(fixture, "dist/.vite/manifest.json"), "utf8"));
    const booking = Object.values(manifest).find(
      ({ src, isDynamicEntry }) => isDynamicEntry && src?.endsWith("/renderers/booking.js"),
    );
    expect(booking).toBeDefined();
    const server = await preview({
      root: fixture,
      configFile: false,
      logLevel: "error",
      preview: { host: "127.0.0.1", port: 0 },
    });
    try {
      const browser = await launchChrome();
      try {
        const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
        await exerciseEntries(page, server.resolvedUrls!.local[0]!, booking!.file);
      } finally {
        await browser.close();
      }
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.httpServer.close((error) => (error ? reject(error) : resolve())),
      );
    }
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
}, 90000);
