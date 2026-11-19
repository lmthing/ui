// Model text to a validated screen, one line at a time. The catalog's full parse and component repairs
// (plan 4.14, R1/R2) are not built yet, so this does the same job in miniature and says what it did.
import { components } from "@lmthing/ui/catalog";
import { stripNulls } from "../live/screen";

export type Line = { id: string; c: string } & Record<string, unknown>;
export type Outcome = { line: Line | null; notes: string[] };
type Issue = { code: string; path: PropertyKey[]; values?: unknown[]; maximum?: number; message: string };
type Def = { props: { safeParse: (v: unknown) => { success: boolean; error?: { issues: Issue[] } } } };

/** Completed top-level objects of the `"lines": [...]` array in streamed text, in order. */
export function closedLines(text: string): string[] {
  const start = text.indexOf("[", text.indexOf('"lines"'));
  if (start < 0 || !text.includes('"lines"')) return [];
  const out: string[] = [];
  let depth = 0;
  let from = -1;
  let inString = false;
  for (let i = start + 1; i < text.length; i++) {
    const ch = text[i]!;
    if (inString) {
      if (ch === "\\") i++;
      else if (ch === '"') inString = false;
    } else if (ch === '"') inString = true;
    else if (ch === "{" && depth++ === 0) from = i;
    else if (ch === "}" && --depth === 0) out.push(text.slice(from, i + 1));
    else if (ch === "]" && depth === 0) break;
  }
  return out;
}

const distance = (a: string, b: string): number => {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]!;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const keep = row[j]!;
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = keep;
    }
  }
  return row[b.length]!;
};

const nearest = (value: string, options: string[]) =>
  options.reduce((best, o) => (distance(value, o) < distance(value, best) ? o : best), options[0]!);

function setAt(root: Record<string, unknown>, path: PropertyKey[], value: unknown) {
  let node = root as Record<PropertyKey, unknown>;
  for (const key of path.slice(0, -1)) node = node[key] as Record<PropertyKey, unknown>;
  node[path[path.length - 1]!] = value;
}
const getAt = (root: unknown, path: PropertyKey[]) =>
  path.reduce<unknown>((n, k) => (n as Record<PropertyKey, unknown> | undefined)?.[k], root);

/** Validates one line against the catalog schema, repairing the small things a small model gets wrong. */
export function checkLine(raw: string, allowed: string[], at: number, taken: Set<string>): Outcome {
  const notes: string[] = [];
  let parsed: Record<string, unknown>;
  try {
    parsed = stripNulls(JSON.parse(raw.replace(/,\s*([}\]])/g, "$1"))) as Record<string, unknown>;
  } catch {
    return { line: null, notes: ["rejected: not valid JSON"] };
  }
  const c = String(parsed.c ?? "");
  const def = (components as unknown as Record<string, Def | undefined>)[c];
  if (!def || !allowed.includes(c)) return { line: null, notes: [`rejected: "${c}" is not in this catalog`] };
  const { c: _c, id: given, ...props } = parsed;
  for (let attempt = 0; attempt < 6; attempt++) {
    const result = def.props.safeParse(props);
    if (result.success) {
      let id =
        typeof given === "string" && /^[a-z][a-z0-9_]*$/.test(given) ? given : `${c.toLowerCase()}${at + 1}`;
      while (taken.has(id)) id = `${id}x`;
      taken.add(id);
      return { line: { id, c, ...props }, notes };
    }
    const issue = result.error!.issues[0]!;
    const here = getAt(props, issue.path);
    if (issue.code === "unrecognized_keys") {
      const keys = (issue as unknown as { keys: string[] }).keys;
      for (const key of keys) delete (getAt(props, issue.path) as Record<string, unknown>)[key];
      notes.push(`repaired: dropped unknown ${keys.join(", ")}`);
    } else if (issue.code === "invalid_value" && issue.values && typeof here === "string") {
      const fix = nearest(here, issue.values.map(String));
      setAt(props, issue.path, fix);
      notes.push(`repaired: ${String(issue.path.at(-1))} "${here}" -> ${fix}`);
    } else if (issue.code === "too_big" && typeof here === "string" && issue.maximum) {
      setAt(props, issue.path, here.slice(0, issue.maximum));
      notes.push(`repaired: shortened ${String(issue.path.at(-1))}`);
    } else {
      return { line: null, notes: [...notes, `rejected: ${c} ${issue.path.join(".")} ${issue.message}`] };
    }
  }
  return { line: null, notes: [...notes, `rejected: ${c} could not be repaired`] };
}
