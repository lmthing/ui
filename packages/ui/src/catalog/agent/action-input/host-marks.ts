import type { Definition } from "../../probes";
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
import { privateMarkKey } from "./host-actions";
import { findAction } from "./offered-actions";

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
