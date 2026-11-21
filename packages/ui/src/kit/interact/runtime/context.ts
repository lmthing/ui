import {
  drawKey,
  liveProps,
  stampItemIds,
  staleDraw,
  sessionKey,
  staleSession,
  migrateScreen,
  resolveDefinition,
  type ActStep,
  type Definition,
  type DeviceData,
  type RandomSource,
  type ReportRemoval,
  type ScreenLike,
  type Values,
} from "../../../catalog";
import { clipboardRuntime, createInteractionStore, projectScreen, valueKey } from "../index";
import type { ClipboardText, ClipboardWriter, InteractionStore, MediaAdapter } from "../index";
import { initialClocks } from "../controls";
import type { ActionEvent, SendHandler } from "../actions";
import { visibleConfirmation } from "./read-controls";
import { createPrivateMarks } from "./private-mark";
import { createHostProjection, type HostCommandAdapter, type ParentGate } from "./host";
import type { AuthenticateReveal } from "./reveal";
export type Confirmation = {
  message: string;
  kind: "primary" | "secondary" | "quiet" | "danger";
  source: string;
  goto?: string;
  step?: ActStep;
  removal?: ReportRemoval;
  host?: true;
};
export type ControllerOptions = {
  screen: ScreenLike;
  defs: Record<string, Definition>;
  lang?: string | undefined;
  media?: MediaAdapter | undefined;
  store?: InteractionStore | undefined;
  deviceData?: DeviceData | undefined;
  now?: (() => number) | undefined;
  random?: RandomSource | undefined;
  onChange?: ((screen: ScreenLike, values: Values) => void) | undefined;
  onSend?: SendHandler | undefined;
  writeClipboard?: ClipboardWriter | undefined;
  resolveClipboardText?: ClipboardText | undefined;
  requestPhoto?: ((address: string) => Promise<string | undefined>) | undefined;
  authenticateReveal?: AuthenticateReveal | undefined;
  interactive?: boolean | undefined;
  requireMounted?: boolean | undefined;
  onLink?: ((goto: string, address: string) => void) | undefined;
  onAction?: ((step: ActionEvent) => void) | undefined;
  hostCommands?: HostCommandAdapter | undefined;
  parentGate?: ParentGate | undefined;
};
export type ScreenComponent = ScreenLike["components"][number];
function initialValues(screen: ScreenLike, defs: Record<string, Definition>, now: () => number): Values {
  const initial: Values = {};
  for (const entry of screen.components) {
    const { id, c, state: _state, ...raw } = entry;
    const input = defs[c]?.props.safeParse(raw);
    if (!input?.success) continue;
    const value = input.data as Values;
    initial[valueKey(screen.id, id, "$runtime")] = true;
    for (const [part, clock] of Object.entries(initialClocks(defs[c]!.meta, value, now())))
      initial[valueKey(screen.id, id, part)] = clock;
    if (c === "List" && value.style === "expand")
      (value.rows as Values[]).forEach((_row, index) => {
        initial[valueKey(screen.id, id, `r${index + 1}`)] = false;
      });
  }
  return initial;
}
function expiredProgress(screen: ScreenLike, defs: Record<string, Definition>, values: Values, now: number) {
  const expired: Values = {};
  const candidates = screen.components.filter(({ id }) =>
    [drawKey, sessionKey].some((part) => values[valueKey(screen.id, id, part)] !== undefined),
  );
  if (!candidates.length) return expired;
  const projected = projectScreen({ ...screen, components: candidates }, defs, values, now, undefined, true);
  const local = Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key.replace(`${screen.id}/`, ""), value]),
  );
  for (const { id, c, state: _state, ...input } of projected.components) {
    const def = defs[c];
    const draw = valueKey(screen.id, id, drawKey);
    const session = valueKey(screen.id, id, sessionKey);
    const props = def?.props.safeParse(input);
    if (!def || !props?.success) continue;
    const live = liveProps(def.meta, stampItemIds(def.meta, props.data as Values), id, local, true);
    if (staleDraw(def.meta, live, values[draw])) expired[draw] = undefined;
    if (staleSession(def.meta, live, values[session])) expired[session] = undefined;
  }
  return expired;
}
function controllerScreen({ screen, defs }: ControllerOptions, standalone: boolean): ScreenLike {
  const migrated = migrateScreen(screen, standalone ? { variantOnly: true } : undefined);
  if (standalone) return migrated;
  const components = migrated.components.map((entry) => ({
    ...entry,
    c: resolveDefinition(defs, entry.c)?.meta.id ?? entry.c,
  }));
  return { ...migrated, components };
}
function relativeAddress(screen: string, address: string) {
  const local = address.startsWith(`${screen}/`) ? address.slice(screen.length + 1) : address;
  return local.replace(/\/root$/, "");
}
function createClipboard(
  { writeClipboard, resolveClipboardText }: ControllerOptions,
  store: InteractionStore,
  status: { disposed: boolean },
) {
  return clipboardRuntime(store, () => status.disposed, writeClipboard, resolveClipboardText);
}
type RuntimeOptions = ControllerOptions & { clipboard?: ReturnType<typeof clipboardRuntime> };
function createValues(
  options: ControllerOptions,
  screen: ScreenLike,
  store: InteractionStore,
  now: () => number,
  standalone: boolean,
) {
  const { defs } = options;
  let initial = standalone ? {} : initialValues(screen, defs, now);
  const localOnly = standalone && !screen.components.some(({ c }) => defs[c]?.meta.recordRuntime);
  const valuesOf = (at = now()) =>
    localOnly
      ? store.snapshot(screen.id)
      : {
          ...initial,
          ...store.snapshot(),
          ...Object.fromEntries(screen.components.map(({ id }) => [valueKey(screen.id, id, "$now"), at])),
        };
  return {
    valuesOf,
    resetValues: () => {
      initial = initialValues(screen, defs, now);
    },
  };
}

export function createControllerContext(options: RuntimeOptions, standalone = false) {
  const { defs, now = Date.now, store = createInteractionStore() } = options;
  const screen = controllerScreen(options, standalone);
  const disabledParts = new Map<string, symbol>();
  const status = {
    disposed: false,
    openSheet: standalone ? undefined : (store.get(`${screen.id}/$sheet`) as string | undefined),
    confirmation: store.get(`${screen.id}/$confirmation`) as Confirmation | undefined,
  };
  const { valuesOf, resetValues } = createValues(options, screen, store, now, standalone);
  const changed = () => store.setMany({});
  const { withPolicy, ...host } = createHostProjection(
    options,
    screen,
    standalone,
    now,
    valuesOf,
    disabledParts,
    changed,
  );
  return {
    standalone,
    options,
    screen,
    defs,
    now,
    store,
    clipboard: createClipboard(options, store, status),
    status,
    valuesOf,
    ...host,
    confirmationFor: (data = options.deviceData, at = now()) =>
      host.admitted()
        ? visibleConfirmation(
            withPolicy(status.confirmation ? valuesOf(at) : {}),
            defs,
            status.confirmation,
            data,
            at,
            valuesOf,
          )
        : undefined,
    expiredProgress: (values: Values, at = now()) => expiredProgress(screen, defs, values, at),
    resetValues,
    mounted: new Map<string, symbol>(),
    disabledParts,
    privateMarks: createPrivateMarks(),
    key: (id: string, part: string) => valueKey(screen.id, id, part),
    relative: (address: string) => relativeAddress(screen.id, address),
    sourceOf: (id: string) => screen.components.find((entry) => entry.id === id),
    inputOf: (entry: ScreenComponent) => {
      const { id: _id, c: _c, state: _state, ...input } = entry;
      return defs[entry.c]!.props.parse(input) as Values;
    },
    notifyChange() {
      if (!options.onChange || !host.admitted()) return;
      const updated = projectScreen(screen, defs, valuesOf(), now(), status.openSheet, true);
      options.onChange(updated, store.snapshot());
    },
  };
}
export type ControllerContext = ReturnType<typeof createControllerContext>;
