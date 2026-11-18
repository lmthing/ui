/** Pack selection is an exact, order-free set of at most three known ids. */
export function scorePack(reply: string, ids: readonly string[], expect: readonly string[]) {
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
    new Set(selected).size === new Set(expect).size &&
    expect.every((id) => selected.includes(id));
  return { pass, detail: pass ? "selected expected packs" : `selected ${reply.trim().slice(0, 80)}` };
}
