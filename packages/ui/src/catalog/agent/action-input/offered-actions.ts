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
import { selectStep, type SelectedStep } from "./select-step";
import { resolveChoice } from "../validate-value";

export function actionValueAddress(address: string, found: Affordance) {
  if (found.nestedStep) return `${address.split("/")[0]}/${found.nestedStep.key}`;
  if (found.flagKey) return `${address.split("/")[0]}/${found.flagKey}`;
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
  const found = offered.find((a) => a.address === address && a.action === original.action);
  if (found?.hostSecret)
    return { error: { ok: false, code: "not_actionable", at, hint: "Use the local control" } as const };
  if (found?.hostReveal)
    return {
      error: { ok: false, code: "not_actionable", at, hint: "Reveal requires a local press" } as const,
    };
  if (!found) {
    const here = offered.filter((a) => a.address === address).map((a) => a.action);
    const hint = here.length ? `offers ${here.join(", ")}` : "no action at this address";
    return { error: { ok: false, code: "not_actionable", at, hint } as const };
  }
  const selected =
    offeredSelection(found, original) ?? selectStep(screen, defs, original, address, next, data, now);
  if (selected.error)
    return { error: { ok: false, code: "invalid_value", at, hint: selected.error } as const };
  const { drive } = found;
  if (!drive) return { address, selected, found, drive, step: selected.step };
  const invalid = validateActionValue(original.action, original.value);
  if (invalid) return { error: { ok: false, at, ...invalid } as const };
  const destination = offered.find((a) => a.address === drive.address && a.action === drive.action);
  if (!destination || destination.hostReveal || destination.hostIntent || destination.hostSecret)
    return { error: { ok: false, code: "not_actionable", at } as const };
  const driven =
    offeredSelection(destination, drive) ?? selectStep(screen, defs, drive, drive.address, next, data, now);
  if (driven.error) return { error: { ok: false, code: "invalid_value", at, hint: driven.error } as const };
  return { address: drive.address, selected: driven, found: destination, drive, step: driven.step };
}

function offeredSelection(found: Affordance, step: ActStep): SelectedStep | undefined {
  const { rowSelection, nestedChoice } = found;
  if (rowSelection)
    return {
      step: { ...step, value: rowSelection.value },
      error:
        step.value === undefined || step.value === rowSelection.value
          ? undefined
          : "Select the option at this address",
    };
  if (nestedChoice) {
    const choice = resolveChoice(nestedChoice.options, step.value);
    return {
      step: { ...step, value: choice?.value },
      error: choice ? undefined : "Select an allowed value at this address",
      declared: true,
    };
  }
}
