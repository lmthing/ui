export const limits = { file: 200, function: 60, folder: 12, readme: 20 } as const;
export const roots = ["src", "scripts", "test", "../../apps/gallery/app"] as const;
export const folderExemptions = ["src/components", "test/recordings"] as const;
export const styleExemptions = ["src/catalog/tokens", "src/catalog/themes"] as const;
export const ruleNames = [
  "file-lines",
  "function-lines",
  "folder-files",
  "readme-lines",
  "folder-imports",
  "hex-colours",
  "numeric-zIndex",
] as const;
export type RuleName = (typeof ruleNames)[number];
export type Violation = { rule: RuleName; file: string; line: number; detail: string };
export type SourceFile = { file: string; source: string };
