import type { Meta } from "../../meta";
import type { Definition } from "../../probes";
import type { ActStep, Values } from "../act";
import { affordancesOf, type Affordance } from "../affordances";
import {
  hasPlaybackClock,
  hasRecordClock,
  hasRuntimeSets,
  recordClockInput,
  recordClockOffer,
  stageRecordClock,
} from "../clocks";
import type { DeviceData } from "../device-data";
import { driveAffordances, driveTarget } from "../drives";
import { liveProps, parseControlProps } from "../live-props";
import type { ScreenLike } from "../read";
import { isRecordAction, recordRequestAllowed, reportEditWire } from "../report-edits";
import { isItemOffer, isSelectAll, projectSelectionBinding, selectionBindingFor } from "../selection-binding";
import { localValues } from "./select-step";
import { hostOnlyAddresses, isPrivateMark } from "./host-actions";
import { hostActionPolicy } from "../host-commands";
import { hasNestedCollectionControls } from "../nested";

type PlannedAffordance = Affordance & { drive?: ActStep; checks?: readonly Affordance[] };

function liveInput(
  def: Definition,
  input: Values,
  id: string,
  local: Values,
  data?: DeviceData,
  now?: number,
) {
  const parsed = parseControlProps(def, input, (part) => local[`${id}/${part}`]);
  return liveProps(def.meta, parsed, id, local, true, data, now);
}

/** Keep the legacy planner's state fallback for definitions without a state opt-in. */
function usesLiveState(meta: Meta) {
  const { draw, emptyActions, errorActions, session, successActions, readSuccess, items, live } = meta;
  return (
    draw ||
    emptyActions ||
    meta.loadingActions?.length ||
    meta.hostCommands ||
    errorActions?.length ||
    session ||
    successActions?.length ||
    readSuccess ||
    items?.nested?.activeParent ||
    items?.nested?.maxActive !== undefined ||
    hasNestedCollectionControls(meta) ||
    live ||
    meta.drives ||
    meta.localState ||
    meta.recordRuntime ||
    meta.linkedEdits ||
    meta.selectionBinding ||
    hasRuntimeSets(meta) ||
    meta.deviceDataFlags ||
    items?.deviceData ||
    items?.edits ||
    items?.move ||
    items?.records ||
    items?.pickers ||
    meta.collections ||
    meta.clear ||
    meta.signOff ||
    hasPlaybackClock(meta) ||
    hasRecordClock(meta)
  );
}

export function affordancesOfScreen(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  values: Values,
  data?: DeviceData,
  now?: number,
  host?: Pick<ActStep, "address" | "action">,
) {
  const local = localValues(screen.id, values);
  return screen.components.flatMap(({ id, c, state, ...input }) => {
    const def = defs[c];
    if (!def) return [];
    const selection = selectionBindingFor(screen, defs, def.meta, id, local, data);
    const props = projectSelectionBinding(
      def.meta,
      liveInput(def, input, id, local, data, now),
      selection?.view,
    );
    const liveState = (props.state as typeof state) ?? (usesLiveState(def.meta) ? state : undefined);
    const get = (part: string) => local[`${id}/${part}`];
    const clock = recordClockOffer(def, input, props, get, data, now, values);
    const wire = reportEditWire(def, input, get);
    const offered = affordancesOf(def.meta, props, id, local, liveState, true, {
      data,
      clock,
      wire,
      schema: def.props,
      host: screen[hostActionPolicy],
      baselineInput: input,
    });
    const hostOnly = hostOnlyAddresses(def, id, offered);
    const allowed = offered.filter(
      ({ address, action }) =>
        (host?.address === address && host.action === action) ||
        (!hostOnly?.has(address) && !isPrivateMark(local, address)),
    );
    const routed = driveAffordances(
      def.meta,
      props,
      id,
      allowed,
      driveTarget(def.meta, screen, defs, local, data),
    );
    if (!selection) return routed;
    return routed.map((a): PlannedAffordance =>
      isSelectAll(def.meta, a.part, a.action, isItemOffer(id, a)) ? { ...a, checks: selection.checks } : a,
    );
  });
}

export function stageRecord(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  next: Values,
  step: ActStep,
  data: DeviceData | undefined,
  now: number,
) {
  const [id, ...parts] = step.address.split("/");
  const { c, id: _id, state: _state, ...raw } = screen.components.find((entry) => entry.id === id)!;
  const def = defs[c]!;
  const target = parts.join("/") || "root";
  const record = isRecordAction(def.meta, target, step.action);
  if (!record && !hasRecordClock(def.meta)) return;
  const base = `${screen.id}/${id}`;
  const get = (part: string) => next[`${base}/${part}`];
  const props = liveInput(def, raw, id!, localValues(screen.id, next), data, now);
  if (record) return recordRequestAllowed(def.meta, props, target, step); // Intent only until confirmation.
  return stageRecordClock(
    recordClockInput(def, raw, props, get, data, now, next),
    next,
    base,
    target,
    step.action,
  );
}
