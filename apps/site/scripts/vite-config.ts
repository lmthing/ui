import type { InlineConfig } from "vite";
import { webResolve } from "../../../packages/ui/scripts/look/web-resolve";

const site = new URL("../", import.meta.url).pathname;

/** The site's Vite config: the gallery's web resolution (React Native Web, Tamagui) and relative asset paths. */
export function siteViteConfig(outDir: string, port?: number): InlineConfig {
  return {
    configFile: false,
    root: site,
    base: "./",
    resolve: webResolve,
    optimizeDeps: { rolldownOptions: { resolve: { extensions: webResolve.extensions } } },
    build: { outDir, emptyOutDir: true, chunkSizeWarningLimit: 1500 },
    server: port ? { host: "127.0.0.1", port } : {},
    logLevel: "warn",
  };
}
