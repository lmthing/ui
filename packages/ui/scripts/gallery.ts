import { build, createServer } from "vite";
import { galleryConfig } from "./gallery-config";

export async function gallery() {
  const config = galleryConfig(5173);
  if (process.argv.includes("--build")) {
    await build(config);
  } else {
    const server = await createServer(config);
    await server.listen();
    server.printUrls();
  }
}

await gallery();
