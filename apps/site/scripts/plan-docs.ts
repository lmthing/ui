// Facts that live only in the docs: build waves and each pack's planned components.
import { existsSync, readFileSync } from "node:fs";
import type { Planned } from "./site-types";

export type Wave = { wave: number; packs: string[]; why: string };

/** Rows of the `## Waves` table in the pack build plan: `| 2 | health, kitchen | why |`. */
export function readWaves(path: string): Wave[] {
  const waves: Wave[] = [];
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const cells = line.split("|").map((cell) => cell.trim());
    if (!/^\d$/.test(cells[1] ?? "") || /^Step/.test(cells[2] ?? "")) continue;
    const packs = (cells[2] ?? "")
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    waves.push({ wave: Number(cells[1]), packs, why: (cells[3] ?? "").replace(/`/g, "") });
  }
  return waves;
}

/** `### \`Name\` · planned · group · tier` headings and the sentence under each. */
export function readPlanned(path: string): Planned[] {
  if (!existsSync(path)) return [];
  const lines = readFileSync(path, "utf8").split("\n");
  const found: Planned[] = [];
  lines.forEach((line, at) => {
    const head = /^### `([A-Za-z]+)` · (\w[\w ]*) · (\w+) · (\w+)/.exec(line);
    if (!head) return;
    const body: string[] = [];
    for (const next of lines.slice(at + 1)) {
      if (!next.trim() || next.startsWith("- ") || next.startsWith("#")) break;
      body.push(next.trim());
    }
    const summary =
      body
        .join(" ")
        .replace(/`/g, "")
        .split(/(?<=[.!?])\s+(?=[A-Z])/)[0] ?? "";
    found.push({ id: head[1]!, group: head[3]!, tier: head[4]!, summary });
  });
  return found;
}
