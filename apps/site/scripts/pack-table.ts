import { readFileSync } from "node:fs";

export type PackRow = { id: string; pick: string; components: number; archetypes: number };

/** Reads the pack index table (`| [id](id.md) | status | pick line | n | n |`) from the docs. */
export function readPackTable(path: string): Record<string, PackRow> {
  const rows: Record<string, PackRow> = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const cells = line.split("|").map((cell) => cell.trim());
    const id = /^\[([a-z]+)\]\(/.exec(cells[1] ?? "")?.[1];
    const components = Number(cells[4]);
    const archetypes = Number(cells[5]);
    if (!id || !Number.isFinite(components) || !Number.isFinite(archetypes)) continue;
    rows[id] = { id, pick: (cells[3] ?? "").replace(/`/g, ""), components, archetypes };
  }
  return rows;
}
