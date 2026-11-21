import { readdirSync, readFileSync } from "node:fs";
import { URL } from "node:url";

const docs = new URL("../../../../docs/", import.meta.url);

export function documentedEmptyStates(markdown: string): Record<string, string> {
  const expectations: Record<string, string> = {};
  let component: string | undefined;
  for (const line of markdown.split("\n")) {
    if (/^#/.test(line)) component = /^#{2,6} `([A-Z]\w+)`/.exec(line)?.[1];
    const direct = /^- `([A-Z]\w+)`:\s+empty \(([^)]+)\)/.exec(line);
    if (direct) expectations[direct[1]!.toLowerCase()] = direct[2]!;
    if (!component) continue;
    const state = /\bStates:\s+.*?\bempty \(([^)]+)\)/i.exec(line);
    if (state) expectations[component.toLowerCase()] = state[1]!;
  }
  return expectations;
}

export function emptyExpectations() {
  const packs = new URL("catalog/packs/", docs);
  const files = readdirSync(packs).filter((name) => name.endsWith(".md") && name !== "README.md");
  return Object.assign(
    {},
    ...[...files.map((name) => new URL(name, packs)), new URL("component-guide.md", docs)].map((file) =>
      documentedEmptyStates(readFileSync(file, "utf8")),
    ),
  ) as Record<string, string>;
}
