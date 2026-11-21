import type { Definition } from "../../probes";
import { parseControlProps, type ActStep, type ScreenLike, type Values } from "../index";

// The in-memory grant survives separate catalog and kit bundles, but carries no serializable text.
const matchesSecret = Symbol.for("@lmthing/ui:secret-reveal");
type Grant = { [matchesSecret]: (fields: readonly unknown[]) => boolean };
export const secretRevealKey = (address: string) => `${address}/$secretReveal`;

export function secretRevealMatches(grant: unknown, fields: readonly unknown[]): boolean {
  const verify = grant && typeof grant === "object" && (grant as Partial<Grant>)[matchesSecret];
  return typeof verify === "function" && verify(fields);
}

export function stageSecretReveal(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  next: Values,
  { address, action, value }: ActStep,
  key: string,
) {
  if (action !== "toggle") return;
  const [instance, item, part] = address.split("/");
  if (!part) return;
  const entry = screen.components.find(({ id }) => instance === id);
  const def = entry && defs[entry.c];
  const spec = def?.meta.items?.revealSecrets;
  if (!entry || !def || !spec || part !== spec.part) return;
  const { id: _id, c: _c, state: _state, ...input } = entry;
  const rows = parseControlProps(def, input)[def.meta.items!.key] as Values[] | undefined;
  const row = rows?.find(({ id }) => id === item);
  if (!row) return;
  const fields = spec.fields.map((field) => row[field]);
  const grant = secretRevealKey(key);
  const shown = (value ?? !secretRevealMatches(next[grant], fields)) === true;
  next[key] = shown;
  if (shown) {
    next[grant] = Object.freeze({
      [matchesSecret]: (candidate: readonly unknown[]) =>
        candidate.length === fields.length && fields.every((field, index) => field === candidate[index]),
    });
  } else {
    next[grant] = undefined;
  }
  return true;
}
