import type { Meta } from "../../meta";
import type { Definition } from "../../probes";
import type { ActStep, Values } from "../act";
import { affordancesOf, type Affordance } from "../affordances";
import { hasPlaybackClock, hasRecordClock, hasRuntimeSets, recordClockOffer } from "../clocks";
import type { DeviceData } from "../device-data";
import { driveAffordances, driveTarget, projectDriveObservation, type CanDrive } from "../drives";
import { hostActionPolicy, type HostActionPolicy } from "../host-commands";
import { localValues, projectLiveInput } from "../live-props";
import { hasNestedCollectionControls } from "../nested";
import { hostOnlyAddresses, isPrivateMark } from "../private-controls";
import type { ScreenLike } from "../read";
import { reportEditWire } from "../report-edits";
import { isItemOffer, isSelectAll, projectSelectionBinding, selectionBindingFor } from "../selection-binding";
import { projectDataViewList, resolveDataViews } from "../data-view";

type PlannedAffordance = Affordance & { drive?: ActStep; checks?: readonly Affordance[] };

/** Keep the legacy planner's state fallback for definitions without a state opt-in. */
function usesLiveState(meta: Meta) {
  const { draw, emptyActions, errorActions, session, successActions, readSuccess, items, live } = meta;
  return (
    draw ||
    meta.buzz ||
    emptyActions ||
    meta.loadingActions?.length ||
    meta.hostCommands ||
    meta.actions?.authenticatedCopy ||
    meta.actions?.privateInput ||
    meta.actions?.privateVerify ||
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
    meta.sequence ||
    meta.media ||
    items?.media ||
    meta.recordRuntime ||
    meta.linkedEdits ||
    meta.selectionBinding ||
    meta.dateSpan ||
    meta.jump ||
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

type OfferOptions = {
  data: DeviceData | undefined;
  now: number | undefined;
  host: HostActionPolicy | undefined;
  includeBlocked: boolean;
  planner?: true;
  canDrive?: CanDrive;
  views?: ReturnType<typeof resolveDataViews>;
};

/** Project once and build the same declarations for the detached planner and mounted kit. */
export function componentOffers(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  { id, c, state, ...raw }: ScreenLike["components"][number],
  values: Values,
  local: Values,
  {
    data,
    now,
    host,
    includeBlocked,
    planner,
    canDrive,
    views = resolveDataViews(screen, defs, local),
  }: OfferOptions,
) {
  const def = defs[c]!;
  const selection = selectionBindingFor(screen, defs, def.meta, id, local, data);
  const live = projectLiveInput(def, raw, id, local, data, now);
  const target = driveTarget(def.meta, screen, defs, local, data, canDrive);
  const observed = projectDriveObservation(
    def.meta,
    projectSelectionBinding(def.meta, live, selection?.view),
    id,
    target,
  );
  const { props, empty } =
    !state || state === "filled" ? projectDataViewList(views, id, observed) : { props: observed };
  if (empty || views.hidden.has(id)) return { props, target, offered: [], selection };
  const get = (part: string) => local[`${id}/${part}`];
  const clock = recordClockOffer(def, raw, props, get, data, now, values);
  const wire = reportEditWire(def, raw, get);
  const liveState =
    (props.state as typeof state) ?? (!planner || usesLiveState(def.meta) ? state : undefined);
  const offered = affordancesOf(def.meta, props, id, local, liveState, includeBlocked, {
    data,
    clock,
    wire,
    schema: def.props,
    host,
    baselineInput: raw,
    now,
  });
  return { props, target, offered, selection };
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
  const views = resolveDataViews(screen, defs, local);
  return screen.components.flatMap((entry) => {
    const { id, c } = entry;
    const def = defs[c];
    if (!def) return [];
    const { props, target, offered, selection } = componentOffers(screen, defs, entry, values, local, {
      data,
      now,
      host: screen[hostActionPolicy],
      includeBlocked: true,
      planner: true,
      views,
    });
    const hostOnly = hostOnlyAddresses(def, id, offered);
    const allowed = offered.filter(
      ({ address, action }) =>
        (host?.address === address && host.action === action) ||
        (!hostOnly?.has(address) && !isPrivateMark(local, address)),
    );
    const routed = driveAffordances(def.meta, props, id, allowed, target);
    if (!selection) return routed;
    return routed.map((a): PlannedAffordance =>
      isSelectAll(def.meta, a.part, a.action, isItemOffer(id, a)) ? { ...a, checks: selection.checks } : a,
    );
  });
}
