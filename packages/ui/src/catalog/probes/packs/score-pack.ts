/** At most three known ids: every expected pack, with only explicitly allowed additions. */
export function scorePack(
  reply: string,
  ids: readonly string[],
  expect: readonly string[],
  allow: readonly string[] = [],
) {
  let selected: unknown;
  try {
    selected = JSON.parse(reply.trim().replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    selected = undefined;
  }
  const valid =
    Array.isArray(selected) &&
    selected.length <= 3 &&
    selected.every((id) => typeof id === "string" && ids.includes(id));
  const pass =
    Array.isArray(selected) &&
    valid &&
    expect.every((id) => selected.includes(id)) &&
    selected.every((id) => expect.includes(id) || allow.includes(id));
  return { pass, detail: pass ? "selected expected packs" : `selected ${reply.trim().slice(0, 80)}` };
}
