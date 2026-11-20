// tsx scripts/tools/serve.ts <dir> [port]: serves a built site like a CDN would (gzip, long cache for hashed assets),
// so Lighthouse and the checks see realistic transfer sizes. Prints `PORT <n>`.
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { createGzip } from "node:zlib";

const [dir = "dist", port = "0"] = process.argv.slice(2);
const types: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
};
const compressible = new Set([".html", ".js", ".css", ".json", ".svg", ".txt", ".md"]);

const server = createServer((req, res) => {
  const path = normalize(decodeURIComponent((req.url ?? "/").split("?")[0]!)).replace(/^(\.\.[/\\])+/, "");
  let file = join(dir, path);
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!existsSync(file)) return void res.writeHead(404).end("Not found");
  const ext = extname(file);
  const headers: Record<string, string> = { "content-type": types[ext] ?? "application/octet-stream" };
  if (path.startsWith("/assets/")) headers["cache-control"] = "public, max-age=31536000, immutable";
  const gzip = compressible.has(ext) && /\bgzip\b/.test(String(req.headers["accept-encoding"]));
  if (gzip) headers["content-encoding"] = "gzip";
  res.writeHead(200, headers);
  const stream = createReadStream(file);
  (gzip ? stream.pipe(createGzip()) : stream).pipe(res);
});
server.listen(Number(port), "127.0.0.1", () =>
  console.log(`PORT ${(server.address() as { port: number }).port}`),
);
