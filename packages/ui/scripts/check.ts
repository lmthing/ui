import { startVitest } from "vitest/node";
import { fileURLToPath, URL } from "node:url";
import { webResolve } from "./index";

export async function check() {
  const runner = await startVitest("test", [], {
    config: false,
    run: true,
    server: { deps: { inline: [/tamagui/, /react-native-svg/] } },
    alias: [
      { find: "@lmthing/ui/kit", replacement: fileURLToPath(new URL("../src/entry/kit.ts", import.meta.url)) },
      ...webResolve.alias,
    ],
    include: ["src/**/*.test.ts", "test/**/*.test.{ts,tsx}"],
  }, { resolve: webResolve });
  if (!runner) throw new Error("Vitest did not start");
  await runner.close();
}

await check();
