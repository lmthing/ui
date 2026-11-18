import type { InlineConfig } from "vite";
import { webResolve } from "./web-resolve";

/** The gallery's Vite config. Port 0 picks a free port (used by `shoot`, so agents never collide). */
export function galleryConfig(port: number): InlineConfig {
  return {
    configFile: false,
    root: new URL("../../../../apps/gallery/", import.meta.url).pathname,
    resolve: webResolve,
    optimizeDeps: { rolldownOptions: { resolve: { extensions: webResolve.extensions } } },
    server: { host: "127.0.0.1", port, strictPort: port !== 0 },
    logLevel: port === 0 ? "error" : "info",
  };
}
