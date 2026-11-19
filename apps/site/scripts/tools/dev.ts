// pnpm --filter @lmthing/site dev: the site on a free local port, reading the data written by `build.ts --data`.
import { createServer } from "vite";
import { siteViteConfig } from "../vite-config";

const server = await createServer(siteViteConfig("dist", Number(process.env.PORT ?? 0)));
await server.listen();
server.printUrls();
