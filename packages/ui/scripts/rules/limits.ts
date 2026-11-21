import { basename, dirname, relative, sep } from "node:path";
import { limits, folderExemptions, packFolderExemption, type SourceFile, type Violation } from "./config";

export function physicalLines(source: string) {
  if (!source) return 0;
  return source.split(/\r?\n/).length - Number(source.endsWith("\n"));
}
export function checkLimits(root: string, sources: SourceFile[]): Violation[] {
  const violations: Violation[] = [];
  const folders = new Map<string, number>();
  for (const { file, source } of sources) {
    const lines = physicalLines(source);
    if (lines > limits.file)
      violations.push({ rule: "file-lines", file, line: 1, detail: `${lines} lines > ${limits.file}` });
    if (basename(file) === "README.md" && lines > limits.readme)
      violations.push({ rule: "readme-lines", file, line: 1, detail: `${lines} lines > ${limits.readme}` });
    const folder = dirname(file);
    folders.set(folder, (folders.get(folder) ?? 0) + 1);
  }
  for (const [file, count] of folders) {
    const path = relative(root, file).split(sep).join("/");
    if (folderExemptions.some((folder) => path === folder) || packFolderExemption.test(path)) continue;
    if (count > limits.folder)
      violations.push({
        rule: "folder-files",
        file,
        line: 1,
        detail: `${count} immediate files > ${limits.folder}`,
      });
  }
  return violations;
}
