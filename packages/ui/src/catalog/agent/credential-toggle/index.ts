import type { Definition } from "../../probes";
import { parseControlProps, type ActStep, type ScreenLike, type Values } from "..";

const checkCredential = Symbol("checkCredential");
type Grant = { readonly [checkCredential]: (credential: string) => boolean };

/** A grant is memory-only. Snapshots and action replies must never serialize the credential. */
export function credentialToggleOn(grant: unknown, credential: unknown): boolean {
  return (
    typeof credential === "string" &&
    !!grant &&
    typeof grant === "object" &&
    (grant as Partial<Grant>)[checkCredential]?.(credential) === true
  );
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
