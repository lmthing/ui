import type { Definition } from "../../probes";
import {
  validateActionValue,
  type ActStep,
  type Affordance,
  type DeviceData,
  type ScreenLike,
  type Values,
} from "../index";
import { moveKey } from "./move";
import { affordancesOfScreen } from "./record-planning";
import { selectStep } from "./select-step";

export function actionValueAddress(address: string, found: Affordance) {
  if (found.nestedStep) return `${address.split("/")[0]}/${found.nestedStep.key}`;
  return found.move ? moveKey(address) : address;
}

export function findAction(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  next: Values,
  original: ActStep,
  at: number,
  data?: DeviceData,
  now?: number,
  hostCapture = false,
) {
  const address = hostCapture
    ? original.address
    : original.address.replace(new RegExp(`^${screen.id}/`), "").replace(/\/root$/, "");
  const offered = affordancesOfScreen(screen, defs, next, data, now, hostCapture ? original : undefined);
  const selected = selectStep(screen, defs, original, address, next, data, now);
  const found = offered.find((a) => a.address === address && a.action === selected.step.action);
  if (!found) {
    const here = offered.filter((a) => a.address === address).map((a) => a.action);
    const hint = here.length ? `offers ${here.join(", ")}` : "no action at this address";
    return { error: { ok: false, code: "not_actionable", at, hint } as const };
  }
  if (selected.error)
    return { error: { ok: false, code: "invalid_value", at, hint: selected.error } as const };
  const { drive } = found;
  if (!drive) return { address, selected, found, drive, step: selected.step };
  const invalid = validateActionValue(original.action, original.value);
  if (invalid) return { error: { ok: false, at, ...invalid } as const };
  const destination = offered.find((a) => a.address === drive.address && a.action === drive.action);
  if (!destination) return { error: { ok: false, code: "not_actionable", at } as const };
  return { address: drive.address, selected, found: destination, drive, step: drive };
}
