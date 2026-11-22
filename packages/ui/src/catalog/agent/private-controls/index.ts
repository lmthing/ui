import type { Definition } from "../../probes";
import type { Meta } from "../../meta";
import type { ActStep, Values } from "../act";
import type { Affordance } from "../affordances";
import { parseControlProps } from "../live-props";
import type { ScreenLike } from "../read";
export {
  acceptsPrivateMark,
  createPrivateMarks,
  hostOnlyParts,
  hostOnlyAddresses,
  isPrivateMark,
  privateMarkKey,
  redactPrivateMarks,
  registerPrivateMark,
  type PrivateMarks,
} from "./capture";

// Catalog and kit can be loaded from different entry bundles in one host process.
const checkCredential = Symbol.for("@lmthing/ui:credential-toggle");
type CredentialGrant = { readonly [checkCredential]: (credential: string) => boolean };

/** A grant is memory-only. Snapshots and action replies must never serialize the credential. */
export function credentialToggleOn(grant: unknown, credential: unknown): boolean {
  if (typeof credential !== "string" || !grant || typeof grant !== "object") return false;
  const check = (grant as Partial<CredentialGrant>)[checkCredential];
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

// The in-memory grant survives separate catalog and kit bundles, but carries no serializable text.
const matchesSecret = Symbol.for("@lmthing/ui:secret-reveal");
type SecretGrant = { [matchesSecret]: (fields: readonly unknown[]) => boolean };
export const secretRevealKey = (address: string) => `${address}/$secretReveal`;

export function secretRevealMatches(grant: unknown, fields: readonly unknown[]): boolean {
  const verify = grant && typeof grant === "object" && (grant as Partial<SecretGrant>)[matchesSecret];
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

export function privateOffer(meta: Meta, address: string, part: string, action: string, item: boolean) {
  const spec = meta.actions;
  const scope = item ? "items" : "parts";
  if (!item && action === "toggle" && spec?.scannerBrightness?.includes(part))
    return { address, part, action, detail: "", hostSecret: "brightness" as const };
  const hostSecret: Affordance["hostSecret"] =
    action === "copy" && spec?.authenticatedCopy?.[scope]?.includes(part)
      ? "copy"
      : !item && action === "type" && Object.hasOwn(spec?.privateInput ?? {}, part)
        ? "input"
        : !item && action === "press" && Object.hasOwn(spec?.privateVerify ?? {}, part)
          ? "verify"
          : undefined;
  if (hostSecret) return { address, part, action, detail: "", hostSecret };
  if (action === "press" && spec?.reveal?.[scope]?.includes(part))
    return { address, part, action, detail: "", hostReveal: true as const };
}
