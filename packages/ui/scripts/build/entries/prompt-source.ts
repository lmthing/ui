export type PromptText = { purpose: string; pick: string; writeHints?: readonly string[] };

export const promptModule = (name: string) => `prompt-${name}.generated`;

const layout = /^## Purpose\n\n([^\n]*)\n\n## Pick\n\n([^\n]*)(?:\n\n## Writer\n\n((?:- [^\n]*\n)*))?\n?$/;

export function parsePrompt(file: string, source: string): PromptText {
  const lines = source.replace(/\r\n/g, "\n");
  const match = layout.exec(lines.endsWith("\n") ? lines : `${lines}\n`);
  if (!match) throw new Error(`${file}: expected Purpose, Pick and optional Writer bullets`);
  const [, purpose, pick, writer] = match;
  return {
    purpose: purpose!,
    pick: pick!,
    ...(writer === undefined
      ? {}
      : {
          writeHints: writer
            .split("\n")
            .slice(0, -1)
            .map((line) => line.slice(2)),
        }),
  };
}

export function renderPrompt(file: string, { purpose, pick, writeHints }: PromptText) {
  const writer = writeHints?.map((hint) => `- ${hint}\n`).join("");
  const source = `## Purpose\n\n${purpose}\n\n## Pick\n\n${pick}${writer === undefined ? "\n" : `\n\n## Writer\n\n${writer}`}`;
  if (JSON.stringify(parsePrompt(file, source)) !== JSON.stringify({ purpose, pick, writeHints }))
    throw new Error(`${file}: prompt fields must each fit on a single line`);
  return source;
}
