export const siteUrl = (process.env.SITE_URL ?? "https://lmthing.github.io/ui/").replace(/\/?$/, "/");

export const link = (text: string, path: string) => `[${text}](${siteUrl}${path})`;

export const fence = (lang: string, text: string) => `\`\`\`${lang}\n${text}\n\`\`\``;

const cell = (text: string) => text.replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " ");

export function table(head: string[], rows: string[][]): string {
  const line = (cells: string[]) => `| ${cells.map(cell).join(" | ")} |`;
  return [line(head), line(head.map(() => "---")), ...rows.map(line)].join("\n");
}

export const tiers: Record<string, string> = {
  phone: "phone",
  ok: "needs your OK",
  people: "needs other people",
  service: "needs an outside service",
};
