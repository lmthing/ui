import type { Definition } from "../../probes";
import { parseControlProps, type Affordance } from "../index";
import { migrateScreen } from "../../migrations";
import type { ActResult, ActStep, Values } from "../act";
import {
  captureDeviceTime,
  deviceTimeOf,
  filterDeviceDataScreen,
  projectDeviceData,
  type DeviceData,
} from "../device-data";
import type { ScreenLike } from "../read";
import { withRecordScreen } from "../record-runtime";
import { validateStep } from "./index";
import { findAction } from "./offered-actions";

type HostOnlyParts = { parts?: readonly string[]; items?: readonly string[] };
type HostPolicy = { hostOnlyParts?: HostOnlyParts };

/** Spread into definition metadata to declare parts only a trusted host can operate. */
export const hostOnlyParts = (parts: HostOnlyParts) => ({ hostOnlyParts: parts });

export function hostOnlyAddresses(def: Definition, instance: string, offers: readonly Affordance[]) {
  const policy = (def.meta as Definition["meta"] & HostPolicy).hostOnlyParts;
  if (!policy) return;
  return new Set(
    offers
      .filter(({ part, address }) => {
        const own = part === "root" ? instance : `${instance}/${part}`;
        return (address === own ? policy.parts : policy.items)?.includes(part);
      })
      .map(({ address }) => address),
  );
}

// Also guard previously captured marks when reading or acting on an older definition.
const privateMarkSuffix = "/$privateMark";
export const privateMarkKey = (screen: string, address: string) => `${screen}/${address}${privateMarkSuffix}`;
export const isPrivateMark = (values: Record<string, unknown>, address: string) =>
  values[`${address}${privateMarkSuffix}`] === true;

/** Redact capture data before projections or copy callbacks read the screen-local values. */
export function redactPrivateMarks(values: Record<string, unknown>) {
  const tags = Object.keys(values).filter((key) => key.endsWith(privateMarkSuffix) && values[key] === true);
  const addresses = new Set<string>();
  if (!tags.length) return { values, addresses };
  const readable = { ...values };
  for (const tag of tags) {
    const address = tag.slice(0, -privateMarkSuffix.length);
    addresses.add(address);
    delete readable[tag];
    delete readable[address];
    delete readable[`${address}/root`];
  }
  return { values: readable, addresses };
}

type Accepts = ((reference: string) => boolean) | undefined;
type Registration = { token: symbol; accepts: Accepts };
export type PrivateMarks = Readonly<{ has(address: string): boolean; size: number }>;
const registries = new WeakMap<PrivateMarks, Map<string, Registration>>();

export function createPrivateMarks(): PrivateMarks {
  const entries = new Map<string, Registration>();
  const marks = Object.freeze({
    has: (address: string) => entries.has(address),
    get size() {
      return entries.size;
    },
  });
  registries.set(marks, entries);
  return marks;
}

export function registerPrivateMark(
  marks: PrivateMarks,
  address: string,
  accepts: Accepts,
  commit: (reference: string, token: symbol) => void,
) {
  const entries = registries.get(marks)!;
  const token = Symbol();
  entries.set(address, { token, accepts });
  return {
    capture: (reference: string) => commit(reference, token),
    unregister: () => {
      // Keep shielding the stored reference when this pad is no longer on screen.
      if (entries.get(address)?.token === token) entries.set(address, { token, accepts: undefined });
    },
  };
}

function acceptsPrivateMark(marks: PrivateMarks, address: string, value: unknown, token: symbol) {
  const entries = registries.get(marks);
  const pad = entries?.get(address);
  if (!pad || pad.token !== token || !pad.accepts || typeof value !== "string" || !value) return false;
  try {
    return pad.accepts(value) && entries?.get(address) === pad;
  } catch {
    // A failed local lookup is an unavailable control, not a reason to expose the reference.
    return false;
  }
}

/** Kit-only entry for one already-canonical, registered capture. */
export function planHostAct(
  input: ScreenLike,
  defs: Record<string, Definition>,
  values: Values,
  step: ActStep,
  marks: PrivateMarks,
  token: symbol,
  data?: DeviceData,
): ActResult {
  const unavailable = { ok: false, code: "not_actionable", at: 0 } as const;
  if (step.action !== "set" || !acceptsPrivateMark(marks, step.address, step.value, token))
    return unavailable;
  const now = deviceTimeOf(data) ?? Date.now();
  const migrated = migrateScreen(input, { variantOnly: true });
  const snapshot = withRecordScreen(projectDeviceData(captureDeviceTime(defs, data, now), values), migrated);
  const screen = filterDeviceDataScreen(migrated, defs, snapshot);
  const action = findAction(screen, defs, values, step, 0, snapshot, now, true);
  if (action.error) return action.error;
  const key = `${screen.id}/${step.address}`;
  const { result } = validateStep(screen, defs, action.found, step, values, key);
  if ("code" in result) return { ok: false, at: 0, ...result };
  if (result.value !== step.value) return unavailable;
  // Do not run generic edit or record effects that can copy the reference to other addresses.
  return {
    ok: true,
    values: { ...values, [key]: step.value, [privateMarkKey(screen.id, step.address)]: true },
    changed: [`${step.address} ${step.action}`],
    links: [],
  };
}

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
