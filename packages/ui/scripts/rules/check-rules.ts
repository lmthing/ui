import { join, relative } from "node:path";
import { roots, ignoredFolders, ruleNames, type RuleName, type Violation } from "./config";
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
function isWarning(rule: RuleName) {
  return rule === "file-lines" || rule === "folder-files";
}

export function countViolations(issues: Violation[]) {
  return issues.filter(({ rule }) => !isWarning(rule)).length;
}

export function formatRules(root: string, issues: Violation[]) {
  const lines: string[] = [];
  for (const rule of ruleNames) {
    const matches = issues.filter((issue) => issue.rule === rule);
    const severity = isWarning(rule) ? "warning" : "violation";
    lines.push(`${rule}: ${matches.length ? `${matches.length} ${severity}(s)` : "PASS"}`);
    for (const issue of matches) lines.push(`  ${relative(root, issue.file)}:${issue.line}: ${issue.detail}`);
  }
  const violations = countViolations(issues);
  const warnings = issues.length - violations;
  lines.push("");
  if (warnings) lines.push(`${warnings} rule warning(s).`);
  lines.push(violations ? `${violations} rule violation(s).` : "All rules pass.");
  return lines.join("\n");
}
