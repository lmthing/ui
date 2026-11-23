import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import { createServer } from "vite";
import { buildKit } from "../scripts/build/build-kit";
import { bundleCheck } from "../scripts/build/bundle-check";
import { webResolve } from "../scripts/look";
import { launchChrome } from "../scripts";

const root = fileURLToPath(new URL("../", import.meta.url));
const app = `
  import { createElement as h } from "react";
  import { createRoot } from "react-dom/client";
  import { createTamagui, createTokens, TamaguiProvider } from "tamagui";
  import { components, createRegistry } from "@lmthing/ui/catalog-browser";
  import { PhoneScreen } from "@lmthing/ui/kit/runtime";
  import { kitFonts, kitThemes, kitTokens } from "@lmthing/ui/kit/tamagui";
  import { renderers as core } from "@lmthing/ui/renderers/core";

  const themes = Object.fromEntries(
    Object.entries({ light: kitThemes.kit_calm_light_moss, ...kitThemes })
      .map(([name, roles]) => [name, { ...roles, color: roles.text, background: roles.bg }]),
  );
  const config = createTamagui({ tokens: createTokens(kitTokens), fonts: kitFonts, themes });
  const root = createRoot(document.querySelector("#root"));
  const header = { id: "h1", c: "Header", title: "Queue" };
  const theme = { preset: "calm", mode: "light", accent: "moss", density: "normal", motion: "quiet" };
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

it("renders a core screen and then loads the requested pack using the published entries", async () => {
  await bundleCheck();
  await buildKit();
  const fixture = await mkdtemp(join(root, "dist", "entry-smoke-"));
  try {
    await writeFile(
      join(fixture, "index.html"),
      '<button>Load pack</button><div id="root"></div><script type="module" src="./app.js"></script>',
    );
    await writeFile(join(fixture, "app.js"), app);
    const server = await createServer({
      root,
      configFile: false,
      logLevel: "error",
      resolve: { ...webResolve, conditions: webResolve.conditions.filter((name) => name !== "source") },
      optimizeDeps: {
        entries: [join(fixture, "index.html")],
        exclude: ["@lmthing/ui"],
        rolldownOptions: { resolve: { extensions: webResolve.extensions } },
      },
      server: { host: "127.0.0.1", port: 0 },
    });
    try {
      await server.listen();
      const browser = await launchChrome();
      try {
        const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
        const requests: string[] = [],
          errors: string[] = [];
        page.on("request", (request) => requests.push(new URL(request.url()).pathname));
        page.on("pageerror", (error) => errors.push(error.message));
        await page.goto(`${server.resolvedUrls!.local[0]}dist/${basename(fixture)}/`);
        await page.getByText("Queue", { exact: true }).waitFor();
        const packFiles = () =>
          requests.filter((path) => /\/dist\/renderers\/(?!core\.js)[^/]+\.js$/.test(path));
        expect(packFiles()).toEqual([]);
        await page.getByRole("button", { name: "Load pack" }).click();
        await page.getByTestId("home/w1/root").waitFor();
        expect(packFiles()).toEqual(["/dist/renderers/booking.js"]);
        expect(errors).toEqual([]);
      } finally {
        await browser.close();
      }
    } finally {
      await server.close();
    }
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
}, 150000);
