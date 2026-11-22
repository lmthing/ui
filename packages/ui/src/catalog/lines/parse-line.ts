import { lineCodes as code, type LineCode } from "./codes";

const closing: Readonly<Record<string, string>> = { "{": "}", "[": "]" };
const fence = /^```(?:jsonl?|ndjson)?[ \t]*(?:\r?\n)?([\s\S]*?)(?:\r?\n)?```$/i;

function normalize(text: string, codes: Set<LineCode>): string | undefined {
  const stack: string[] = [];
  let out = "",
    quote = "",
    previous = "";
  for (let at = 0; at < text.length; at++) {
    const char = text[at]!;
    if (quote) {
      if (char === "\\") {
        const next = text[++at];
        if (next === undefined) return;
        out += quote === "'" && next === "'" ? "'" : `\\${next}`;
      } else if (char === quote) {
        out += '"';
        quote = "";
        previous = '"';
      } else out += quote === "'" && char === '"' ? '\\"' : char;
      continue;
    }
    if (char === "'" || char === '"') {
      if (char === "'") codes.add(code.quotes);
      quote = char;
      out += '"';
      continue;
    }
    if (closing[char]) stack.push(closing[char]);
    if ((char === "}" || char === "]") && stack.pop() !== char) return;
    if (char === "," && previous && !"{[:,".includes(previous)) {
      let next = at + 1;
      while (/\s/.test(text[next] ?? "")) next++;
      if (stack.length && (text[next] === stack.at(-1) || next === text.length)) {
        codes.add(code.comma);
        continue;
      }
    }
    out += char;
    if (!/\s/.test(char)) previous = char;
  }
  if (quote) return;
  if (stack.length) codes.add(code.close);
  return out + stack.reverse().join("");
}

/** Recover one JSON value, never extract a value out of surrounding prose. */
export function parseLine(text: string): { line?: unknown; codes: LineCode[] } {
  const codes = new Set<LineCode>();
  const trimmed = text.trim();
  const fenced = fence.exec(trimmed);
  if (fenced) codes.add(code.fence);
  const candidate = normalize((fenced?.[1] ?? trimmed).trim(), codes);
  if (candidate !== undefined) {
    try {
      return { line: JSON.parse(candidate), codes: [...codes] };
    } catch {
      // A syntactic repair is only credited when the repaired line can be read.
    }
  }
  return { codes: [code.parseDrop] };
}
