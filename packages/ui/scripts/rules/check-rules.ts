import { join, relative } from "node:path";
import { roots, ignoredFolders, ruleNames, type Violation } from "./config";
import { readSources } from "./files";
import { checkLimits } from "./limits";
import { checkLanguage } from "./language";
import { checkSource } from "./source";

export async function checkRules(root: string): Promise<Violation[]> {
  const ignored = ignoredFolders.map((folder) => join(root, folder));
  const sources = (await Promise.all(roots.map((folder) => readSources(join(root, folder), ignored)))).flat();
  const paths = new Set(sources.map(({ file }) => file));
  return [
    ...checkLimits(root, sources),
    ...sources.flatMap(({ file, source }) => [
      ...checkSource(root, file, source, paths),
      ...checkLanguage(file, source),
    ]),
  ].sort(
    (a, b) =>
      ruleNames.indexOf(a.rule) - ruleNames.indexOf(b.rule) ||
      a.file.localeCompare(b.file) ||
      a.line - b.line,
  );
}
export function formatRules(root: string, violations: Violation[]) {
  const lines: string[] = [];
  for (const rule of ruleNames) {
    const matches = violations.filter((issue) => issue.rule === rule);
    lines.push(`${rule}: ${matches.length ? `${matches.length} violation(s)` : "PASS"}`);
    for (const issue of matches) lines.push(`  ${relative(root, issue.file)}:${issue.line}: ${issue.detail}`);
  }
  lines.push(violations.length ? `\n${violations.length} rule violation(s).` : "\nAll rules pass.");
  return lines.join("\n");
}
