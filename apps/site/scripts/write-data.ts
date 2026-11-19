import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { RecordedData, SiteData } from "./site-types";

/** The generated data module the app imports. It is ignored by git and rebuilt on every build. */
export function writeData(path: string, data: SiteData & RecordedData): void {
  mkdirSync(dirname(path), { recursive: true });
  const { screens, readProbes, ...site } = data;
  writeFileSync(path, JSON.stringify(site));
  writeFileSync(path.replace(/site-data\.json$/, "recorded.json"), JSON.stringify({ screens, readProbes }));
}
