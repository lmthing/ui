import { fileURLToPath } from "node:url";
import { generateComponent } from "./generate";

try {
  const [scope, name, ...rest] = process.argv.slice(2);
  if (!scope || !name || rest.length)
    throw new Error("Usage: pnpm gen:component <pack|core> <PascalCaseName>");
  const workspace = fileURLToPath(new URL("../../../../", import.meta.url));
  const { written, skipped } = await generateComponent(workspace, scope, name);
  for (const file of written) console.log(`Created ${file}`);
  for (const file of skipped) console.log(`Kept ${file}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
