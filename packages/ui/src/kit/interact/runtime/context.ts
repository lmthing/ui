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
  type RandomSource,
  type ScreenLike,
  type Values,
} from "../../../catalog";
import {
  createInteractionStore,
  projectScreen,
  valueKey,
  type InteractionStore,
  type MediaAdapter,
} from "../index";
import { initialClocks } from "../controls";
export type Confirmation = {
  message: string;
  kind: "primary" | "secondary" | "quiet" | "danger";
  source: string;
  goto?: string;
  step?: ActStep;
};
export type ControllerOptions = {
  screen: ScreenLike;
  defs: Record<string, Definition>;
  lang?: string | undefined;
  media?: MediaAdapter | undefined;
  store?: InteractionStore | undefined;
  now?: (() => number) | undefined;
  random?: RandomSource | undefined;
  onChange?: ((screen: ScreenLike, values: Values) => void) | undefined;
  onSend?: ((text: string, address: string) => void) | undefined;
  requestPhoto?: ((address: string) => Promise<string | undefined>) | undefined;
  interactive?: boolean | undefined;
  requireMounted?: boolean | undefined;
  onLink?: ((goto: string, address: string) => void) | undefined;
  onAction?: ((step: ActStep) => void) | undefined;
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
  const candidates = screen.components.filter(
    (entry) =>
      values[valueKey(screen.id, entry.id, drawKey)] !== undefined ||
      values[valueKey(screen.id, entry.id, sessionKey)] !== undefined,
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
export function createControllerContext(options: ControllerOptions, standalone = false) {
  const { defs } = options;
  const screen = controllerScreen(options, standalone);
  const now = options.now ?? Date.now;
  const store = options.store ?? createInteractionStore();
  let initial = standalone ? {} : initialValues(screen, defs, now);
  const status = {
    disposed: false,
    openSheet: standalone ? undefined : (store.get(`${screen.id}/$sheet`) as string | undefined),
    confirmation: store.get(`${screen.id}/$confirmation`) as Confirmation | undefined,
  };
  const valuesOf = (at = now()) =>
    standalone
      ? store.snapshot(screen.id)
      : {
          ...initial,
          ...store.snapshot(),
          ...Object.fromEntries(
            screen.components.map((entry) => [valueKey(screen.id, entry.id, "$now"), at]),
          ),
        };
  const liveScreen = (values: Values, sheet: string | undefined, covered = false, at = now()): ScreenLike => {
    if (standalone) return screen;
    const projected = projectScreen(screen, defs, values, at, sheet, false, false);
    return covered
      ? { ...projected, components: projected.components.filter((entry) => entry.id === sheet) }
      : projected;
  };
  return {
    standalone,
    options,
    screen,
    defs,
    now,
    store,
    status,
    valuesOf,
    liveScreen,
    expiredProgress: (values: Values, at = now()) => expiredProgress(screen, defs, values, at),
    resetValues: () => {
      initial = initialValues(screen, defs, now);
    },
    mounted: new Map<string, symbol>(),
    disabledParts: new Map<string, symbol>(),
    key: (id: string, part: string) => valueKey(screen.id, id, part),
    relative: (address: string) => relativeAddress(screen.id, address),
    sourceOf: (id: string) => screen.components.find((entry) => entry.id === id),
    inputOf: (entry: ScreenComponent) => {
      const { id: _id, c: _c, state: _state, ...input } = entry;
      return defs[entry.c]!.props.parse(input) as Values;
    },
    notifyChange: () =>
      options.onChange?.(
        projectScreen(screen, defs, valuesOf(), now(), status.openSheet, true),
        store.snapshot(),
      ),
  };
}
export type ControllerContext = ReturnType<typeof createControllerContext>;

export function snapshotPlanning(ctx: ControllerContext): ControllerContext {
  const at = ctx.now();
  const values = ctx.valuesOf(at);
  return {
    ...ctx,
    now: () => at,
    valuesOf: () => values,
    status: { ...ctx.status },
    mounted: new Map(ctx.mounted),
    disabledParts: new Map(ctx.disabledParts),
    liveScreen: (next, sheet, covered) => ctx.liveScreen(next, sheet, covered, at),
    expiredProgress: (next) => ctx.expiredProgress(next, at),
  };
}
