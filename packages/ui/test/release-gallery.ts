import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { fileURLToPath, URL } from "node:url";
import { build, preview, type InlineConfig, type PreviewServer } from "vite";

/** Serve a single build so each fixture navigation does not reload the Vite dev module graph. */
export async function releaseGallery(
  config: InlineConfig,
  signal: AbortSignal,
): Promise<Pick<PreviewServer, "resolvedUrls" | "close">> {
  const shots = new URL("../shots/", import.meta.url);
  await mkdir(shots, { recursive: true });
  const outDir = await mkdtemp(fileURLToPath(new URL("browser-gallery-", shots)));
  let server: PreviewServer | undefined;
  const close = async () => {
    try {
      await server?.close();
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  };
  const options = {
    ...config,
    mode: "production",
    logLevel: "error" as const,
    build: { outDir },
    preview: { host: "127.0.0.1", port: 0 },
  };
  try {
    signal.throwIfAborted();
    await build(options);
    signal.throwIfAborted();
    server = await preview(options);
    signal.throwIfAborted();
    return { resolvedUrls: server.resolvedUrls, close };
  } catch (error) {
    await close();
    throw error;
  }
}
