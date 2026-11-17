import { build, createServer, type InlineConfig } from "vite";
import { webResolve } from "./index";

export async function gallery() {
  const config: InlineConfig = {
    configFile: false,
    resolve: webResolve,
    optimizeDeps: { rolldownOptions: { resolve: { extensions: webResolve.extensions } } },
    server: { host: "127.0.0.1", port: 5173, strictPort: true },
  };
  if (process.argv.includes("--build")) {
    await build(config);
  } else {
    const server = await createServer(config);
    await server.listen();
    server.printUrls();
  }
}

await gallery();
