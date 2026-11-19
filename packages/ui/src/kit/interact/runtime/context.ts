import {
  migrateScreen,
  resolveDefinition,
  type ActStep,
  type Definition,
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
  media?: MediaAdapter | undefined;
  store?: InteractionStore | undefined;
  now?: (() => number) | undefined;
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
export function createControllerContext(options: ControllerOptions) {
  const { defs } = options;
  const migrated = migrateScreen(options.screen);
  const screen: ScreenLike = {
    ...migrated,
    components: migrated.components.map((entry) => ({
      ...entry,
      c: resolveDefinition(defs, entry.c)?.meta.id ?? entry.c,
    })),
  };
  const now = options.now ?? Date.now;
  const store = options.store ?? createInteractionStore();
  let initial = initialValues(screen, defs, now);
  const status = {
    disposed: false,
    openSheet: store.get(`${screen.id}/$sheet`) as string | undefined,
    confirmation: store.get(`${screen.id}/$confirmation`) as Confirmation | undefined,
  };
  const valuesOf = () => ({
    ...initial,
    ...store.snapshot(),
    ...Object.fromEntries(screen.components.map((entry) => [valueKey(screen.id, entry.id, "$now"), now()])),
  });
  const liveScreen = (values: Values, sheet: string | undefined, covered = false): ScreenLike => {
    const projected = projectScreen(screen, defs, values, now(), sheet, false, false);
    return covered
      ? { ...projected, components: projected.components.filter((entry) => entry.id === sheet) }
      : projected;
  };
  return {
    options,
    screen,
    defs,
    now,
    store,
    status,
    valuesOf,
    liveScreen,
    resetValues: () => {
      initial = initialValues(screen, defs, now);
    },
    mounted: new Map<string, symbol>(),
    key: (id: string, part: string) => valueKey(screen.id, id, part),
    relative: (address: string) => address.replace(`${screen.id}/`, "").replace(/\/root$/, ""),
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
