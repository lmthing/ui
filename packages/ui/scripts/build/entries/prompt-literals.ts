import type { PromptText } from "./prompt-source";

export type PromptField = keyof PromptText;
type Quote = "d" | "s";
export type PromptLiteralStyle = { purpose: Quote; pick: Quote; writeHints?: string };

const styleLine = /^<!-- replay-literals: ([ds]) ([ds])(?: ([mi][cn][ds]*))? -->\r?\n\r?\n/;

export function withoutLiteralStyle(markdown: string) {
  return markdown.replace(styleLine, "");
}

function hintQuote(value: string): Quote {
  return value.split('"').length > value.split("'").length ? "s" : "d";
}

export function defaultLiteralStyle({ writeHints }: PromptText): PromptLiteralStyle {
  return {
    purpose: "d",
    pick: "d",
    ...(writeHints === undefined ? {} : { writeHints: `mc${writeHints.map(hintQuote).join("")}` }),
  };
}

export function promptLiteralStyle(markdown: string, text: PromptText): PromptLiteralStyle {
  const match = styleLine.exec(markdown);
  if (!match) return defaultLiteralStyle(text);
  const [, purpose, pick, writeHints] = match;
  return {
    purpose: purpose as Quote,
    pick: pick as Quote,
    ...(writeHints === undefined ? {} : { writeHints }),
  };
}

export function renderLiteralStyle(text: PromptText, style: PromptLiteralStyle) {
  const expected = defaultLiteralStyle(text);
  if (
    style.purpose === expected.purpose &&
    style.pick === expected.pick &&
    style.writeHints === expected.writeHints
  )
    return "";
  return `<!-- replay-literals: ${style.purpose} ${style.pick}${style.writeHints === undefined ? "" : ` ${style.writeHints}`} -->\n\n`;
}

export function quoteLiteral(value: string, quote: Quote) {
  const json = JSON.stringify(value);
  if (quote === "d") return json;
  return `'${json
    .slice(1, -1)
    .replace(/\\(.)|'/g, (_, escape: string | undefined) =>
      escape === '"' ? '"' : escape === undefined ? "\\'" : `\\${escape}`,
    )}'`;
}

/** Resolve prompt values in the old AST printer's syntax without storing a second copy of the text. */
export function replayLiteral(field: PromptField, text: PromptText, style: PromptLiteralStyle) {
  if (field !== "writeHints") return quoteLiteral(text[field], style[field]);
  if (text.writeHints === undefined) return;
  const [layout = "m", comma = "c", ...quotes] = style.writeHints ?? "";
  const values = text.writeHints.map((value, index) =>
    quoteLiteral(value, quotes[index] === "s" ? "s" : quotes[index] === "d" ? "d" : hintQuote(value)),
  );
  if (!values.length) return "[]";
  const trailing = comma === "c" ? "," : "";
  return layout === "m" ? `[\n${values.join(",\n")}${trailing}\n]` : `[${values.join(", ")}${trailing}]`;
}
