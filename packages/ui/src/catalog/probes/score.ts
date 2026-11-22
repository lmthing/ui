import type { Definition, WriteProbe } from "./types";
import { writerInput } from "../format";
import type { Variants } from "../types";

type Score = { pass: boolean; detail: string };

/** The first known component id in the reply. */
export function scoreChoose(reply: string, ids: readonly string[], expect: string): Score {
  // Any case: "gallery" names Gallery.
  const byWord = new Map(ids.map((id) => [id.toLowerCase(), id]));
  const named = reply
    .match(/[A-Za-z][A-Za-z0-9]+/g)
    ?.map((word) => byWord.get(word.toLowerCase()))
    .find(Boolean);
  return named === expect
    ? { pass: true, detail: expect }
    : { pass: false, detail: `chose ${named ?? `nothing (${reply.trim().slice(0, 40)})`}` };
}

function jsonLine(reply: string): unknown {
  const start = reply.indexOf("{");
  const end = reply.lastIndexOf("}");
  if (start < 0 || end < start) return undefined;
  try {
    return JSON.parse(reply.slice(start, end + 1));
  } catch {
    return undefined;
  }
}

/** Valid first time: right component, props pass the schema with no repair. */
export function scoreWrite(
  reply: string,
  def: Definition,
  variant?: WriteProbe["variant"],
  expectProps?: WriteProbe["expectProps"],
  fields?: WriteProbe["fields"],
): Score {
  const line = jsonLine(reply);
  if (!line || typeof line !== "object") return { pass: false, detail: "no JSON object" };
  const { c, ...rest } = line as Record<string, unknown>;
  if (c !== def.meta.id) return { pass: false, detail: `wrote c=${String(c)}` };
  const input = writerInput(def, rest) as Record<string, unknown>;
  const parsed = def.props.safeParse(input);
  if (parsed.success) {
    const mismatch = expectProps && firstMismatch(input, expectProps);
    if (mismatch) return { pass: false, detail: `missing or incorrect ${mismatch}` };
    for (const [path, expected] of Object.entries(fields ?? {})) {
      const actual = path.split(".").reduce<unknown>((value, key) => {
        if (value && typeof value === "object" && Object.hasOwn(value, key))
          return (value as Record<string, unknown>)[key];
      }, input);
      if (actual !== expected)
        return { pass: false, detail: `expected ${path}: ${expected}, got ${String(actual)}` };
    }
    return variant ? scoreVariant(input, def, variant) : { pass: true, detail: "valid first time" };
  }
  const issues = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
  return { pass: false, detail: issues.slice(0, 3).join("; ") };
}

function firstMismatch(actual: unknown, expected: unknown, field = "props"): string | undefined {
  if (actual === expected) return undefined;
  if (actual === null || expected === null || typeof actual !== "object" || typeof expected !== "object")
    return field;
  if (Array.isArray(actual) !== Array.isArray(expected)) return field;
  if (Array.isArray(expected) && (actual as unknown[]).length !== expected.length) return field;
  for (const [key, value] of Object.entries(expected)) {
    const mismatch = firstMismatch((actual as Record<string, unknown>)[key], value, `${field}.${key}`);
    if (mismatch) return mismatch;
  }
}

function hasItemTitles(rows: unknown, titles: readonly string[]): boolean {
  return (
    Array.isArray(rows) &&
    rows.length === titles.length &&
    titles.every((title, index) => {
      const actual: unknown = rows[index]?.title ?? rows[index]?.label ?? rows[index]?.name;
      return typeof actual === "string" && actual.trim().toLowerCase() === title.toLowerCase();
    })
  );
}

function scoreVariant(
  input: Record<string, unknown>,
  { meta }: Definition,
  { axis, value, item, itemTitles }: NonNullable<WriteProbe["variant"]>,
): Score {
  const axes: Variants | undefined = item === undefined ? meta.variants : meta.items?.variants;
  const values: readonly string[] | undefined = axes?.[axis];
  if (!values || (value !== null && !values.includes(value)))
    return { pass: false, detail: `probe expects undeclared ${axis}` };
  const rows = meta.items && input[meta.items.key];
  if (itemTitles && !hasItemTitles(rows, itemTitles))
    return { pass: false, detail: `expected items in order: ${itemTitles.join(", ")}` };
  const target = item === undefined ? input : Array.isArray(rows) ? rows[item] : undefined;
  if (!target || typeof target !== "object") return { pass: false, detail: `missing item ${item}` };
  const actual = (target as Record<string, unknown>)[axis];
  const expected = value === null ? "omitted" : value;
  if (actual !== (value ?? undefined))
    return { pass: false, detail: `expected ${axis}: ${expected}, got ${String(actual)}` };
  const unexpected = (props: unknown, declared: Variants | undefined, index?: number) =>
    props && typeof props === "object"
      ? Object.keys(declared ?? {}).find(
          (key) => (key !== axis || item !== index) && (props as Record<string, unknown>)[key] !== undefined,
        )
      : undefined;
  const extra = unexpected(input, meta.variants);
  if (extra) return { pass: false, detail: `unrequested variant: ${extra}` };
  if (Array.isArray(rows))
    for (const [index, row] of rows.entries()) {
      const extra = unexpected(row, meta.items?.variants, index);
      if (extra) return { pass: false, detail: `unrequested item ${index} variant: ${extra}` };
    }
  return { pass: true, detail: `${axis}: ${expected}` };
}

const normalAddress = (address: string) => address.replace(/^home\//, "").replace(/\/root$/, "");

/** Acted right: the address (ignoring the screen id and a trailing /root) and the action match. */
export function scoreRead(reply: string, expect: { address: string; action: string }): Score {
  const line = jsonLine(reply) as { address?: unknown; action?: unknown } | undefined;
  if (!line || typeof line.address !== "string") return { pass: false, detail: "no address" };
  // Models sometimes paste the action onto the address ("s1/l5 select"): the address is its first word.
  const address = normalAddress(line.address.trim().split(/\s+/)[0] ?? "");
  const action = String(line.action ?? "").match(/^[a-z]+/)?.[0];
  const pass = address === normalAddress(expect.address) && action === expect.action;
  return { pass, detail: pass ? "acted right" : `did ${String(line.action)} on ${address}` };
}
