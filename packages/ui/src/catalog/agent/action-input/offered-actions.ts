import type { Definition } from "../../probes";
import {
  affordancesOf,
  driveAffordances,
  driveTarget,
  hasPlaybackClock,
  liveProps,
  parseControlProps,
  validateActionValue,
  type ActStep,
  type DeviceData,
  type ScreenLike,
  type Values,
} from "../index";
import { localValues, selectStep } from "./select-step";

function affordancesOfScreen(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  values: Values,
  data?: DeviceData,
) {
  const local = localValues(screen.id, values);
  return screen.components.flatMap(({ id, c, state, ...input }) => {
    const def = defs[c];
    if (!def) return [];
    const { meta } = def;
    const parsed = parseControlProps(def, input, (part) => local[`${id}/${part}`]);
    const props = liveProps(meta, parsed, id, local, true, data);
    const { draw, emptyActions, errorActions, session, successActions, readSuccess, items, live } = meta;
    const policy = items?.nested?.activeParent || items?.nested?.maxActive !== undefined;
    // Keep the legacy data-only planner's state fallback for definitions without a state opt-in.
    const liveState =
      (props.state as typeof state) ??
      (draw ||
      emptyActions ||
      errorActions?.length ||
      session ||
      successActions?.length ||
      readSuccess ||
      policy ||
      live ||
      meta.drives ||
      meta.linkedEdits ||
      hasPlaybackClock(meta)
        ? state
        : undefined);
    const offered = affordancesOf(meta, props, id, local, liveState, true);
    return driveAffordances(meta, props, id, offered, driveTarget(meta, screen, defs, local, data));
  });
}

export function findAction(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  next: Values,
  original: ActStep,
  at: number,
  data?: DeviceData,
) {
  const offered = affordancesOfScreen(screen, defs, next, data);
  const address = original.address.replace(new RegExp(`^${screen.id}/`), "").replace(/\/root$/, "");
  const selected = selectStep(screen, defs, original, address, next, data);
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
