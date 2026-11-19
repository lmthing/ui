import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { SiteData } from "./site-types";

/** The generated data module the app imports. It is ignored by git and rebuilt on every build. */
export function writeData(path: string, data: SiteData): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data));
}
