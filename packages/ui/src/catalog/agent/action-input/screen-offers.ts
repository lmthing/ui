import type { Definition } from "../../probes";
import {
  affordancesOf,
  hasPlaybackClock,
  liveProps,
  parseControlProps,
  type ActStep,
  type ScreenLike,
  type Values,
} from "../index";
import type { DeviceData } from "../device-data";
import { hostOnlyAddresses, privateMarkKey } from "./host-actions";
import { localValues } from "./select-step";

export function liveInput(def: Definition, input: Values, id: string, local: Values, data?: DeviceData) {
  const parsed = parseControlProps(def, input, (part) => local[`${id}/${part}`]);
  return liveProps(def.meta, parsed, id, local, true, data);
}

export function affordancesOfScreen(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  values: Values,
  data?: DeviceData,
  host?: Pick<ActStep, "address" | "action">,
) {
  const local = localValues(screen.id, values);
  return screen.components.flatMap(({ id, c, state, ...input }) => {
    const def = defs[c];
    if (!def) return [];
    const props = liveInput(def, input, id, local, data);
    const { draw, emptyActions, errorActions, session, successActions, readSuccess, items, live } = def.meta;
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
      def.meta.linkedEdits ||
      hasPlaybackClock(def.meta)
        ? state
        : undefined);
    const offered = affordancesOf(def.meta, props, id, local, liveState, true);
    const hostOnly = hostOnlyAddresses(def, id, offered);
    return offered.filter(
      ({ address, action }) =>
        (host?.address === address && host.action === action) ||
        (!hostOnly?.has(address) && values[privateMarkKey(screen.id, address)] !== true),
    );
  });
}
