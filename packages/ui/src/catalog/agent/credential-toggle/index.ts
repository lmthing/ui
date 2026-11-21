import type { Definition } from "../../probes";
import { parseControlProps, type ActStep, type ScreenLike, type Values } from "..";

// Catalog and kit can be loaded from different entry bundles in one host process.
const checkCredential = Symbol.for("@lmthing/ui:credential-toggle");
type Grant = { readonly [checkCredential]: (credential: string) => boolean };

/** A grant is memory-only. Snapshots and action replies must never serialize the credential. */
export function credentialToggleOn(grant: unknown, credential: unknown): boolean {
  if (typeof credential !== "string" || !grant || typeof grant !== "object") return false;
  const check = (grant as Partial<Grant>)[checkCredential];
  return typeof check === "function" && check(credential) === true;
}

export function stageCredentialToggle(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  next: Values,
  { address, action, value }: ActStep,
): string | undefined {
  if (action !== "toggle") return;
  const [instance, part, itemPart] = address.split("/");
  if (!part || itemPart) return;
  const entry = screen.components.find((entry) => entry.id === instance);
  const def = entry && defs[entry.c];
  const scopes = def?.meta.actions?.credentialToggles;
  if (!def || !scopes || !Object.hasOwn(scopes, part)) return;
  const { id: _id, c: _c, state: _state, ...raw } = entry!;
  const credential = parseControlProps(def, raw)[scopes[part]!];
  if (typeof credential !== "string") return;
  const key = `${screen.id}/${address}`;
  const on = typeof value === "boolean" ? value : !credentialToggleOn(next[key], credential);
  next[key] = on
    ? Object.freeze({ [checkCredential]: (candidate: string) => candidate === credential })
    : undefined;
  return ` = ${on}`;
}
