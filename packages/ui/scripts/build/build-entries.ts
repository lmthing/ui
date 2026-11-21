import { fileURLToPath, URL } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
if (process.argv.includes("--cached")) {
  const { buildCachedEntries } = await import("./cache");
  await buildCachedEntries(root);
} else {
  const { generateEntries } = await import("./entries");
  await generateEntries(root);
}
