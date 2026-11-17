import type { Definition } from "./types";

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
export function scoreWrite(reply: string, def: Definition): Score {
  const line = jsonLine(reply);
  if (!line || typeof line !== "object") return { pass: false, detail: "no JSON object" };
  const { c, ...rest } = line as Record<string, unknown>;
  if (c !== def.meta.id) return { pass: false, detail: `wrote c=${String(c)}` };
  const parsed = def.props.safeParse(rest);
  if (parsed.success) return { pass: true, detail: "valid first time" };
  const issues = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
  return { pass: false, detail: issues.slice(0, 3).join("; ") };
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
