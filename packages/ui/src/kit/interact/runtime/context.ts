import {
  monotonicNow,
  migrateScreen,
  mediaHostKey,
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
import type {
  AttachmentHost,
  ClipboardText,
  ClipboardWriter,
  InteractionStore,
  MediaAdapter,
  PlaybackResolver,
} from "../index";
import { initialClocks } from "../controls";
import type { ActionEvent, SendHandler } from "../actions";
import { createMicCapture, type MicCaptureAdapter } from "./capture";
import { visibleConfirmation } from "./read-controls";
import { createPrivateMarks } from "./private-mark";
import { createHostProjection, type HostCommandAdapter, type ParentGate } from "./host";
import type { AuthenticateReveal, PrivateValuesHost } from "./private-values";
import { expiredProgress } from "./expired-progress";
import { mediaHostGate, type AttachmentEntries } from "./media";
import { createDisabledParts } from "./part-registration";
export type Confirmation = {
  message: string;
  kind: "primary" | "secondary" | "quiet" | "danger";
  source: string;
  goto?: string;
  step?: ActStep;
  removal?: ReportRemoval;
  host?: true;
  mediaBound?: true;
};
export type ControllerOptions = {
  screen: ScreenLike;
  defs: Record<string, Definition>;
  lang?: string | undefined;
  media?: MediaAdapter | undefined;
  micCapture?: MicCaptureAdapter | undefined;
  resolvePlayback?: PlaybackResolver | undefined;
  attachments?: AttachmentHost | undefined;
  store?: InteractionStore | undefined;
  deviceData?: DeviceData | undefined;
  now?: (() => number) | undefined;
  touchNow?: (() => number) | undefined;
  random?: RandomSource | undefined;
  onChange?: ((screen: ScreenLike, values: Values) => void) | undefined;
  onSend?: SendHandler | undefined;
  writeClipboard?: ClipboardWriter | undefined;
  resolveClipboardText?: ClipboardText | undefined;
  requestPhoto?: ((address: string) => Promise<string | undefined>) | undefined;
  authenticateReveal?: AuthenticateReveal | undefined;
  privateValues?: PrivateValuesHost | undefined;
  interactive?: boolean | undefined;
  requireMounted?: boolean | undefined;
  onLink?: ((goto: string, address: string) => void) | undefined;
  onAnchor?: ((address: string, action: "focus" | "jump") => void) | undefined;
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
  disposed: () => boolean,
) {
  return clipboardRuntime(store, disposed, writeClipboard, resolveClipboardText);
}
type RuntimeOptions = ControllerOptions & { clipboard?: ReturnType<typeof clipboardRuntime> };
function createValues(
  options: ControllerOptions,
  screen: ScreenLike,
  store: InteractionStore,
  now: () => number,
  standalone: boolean,
  attachmentEntries: AttachmentEntries,
) {
  const { defs } = options;
  const host = mediaHostGate(options, screen.id, attachmentEntries);
  let initial = standalone ? {} : initialValues(screen, defs, now);
  const localOnly = standalone && !host && !screen.components.some(({ c }) => defs[c]?.meta.recordRuntime);
  const valuesOf = (at = now()) =>
    localOnly
      ? store.snapshot(screen.id)
      : {
          ...initial,
          ...store.snapshot(),
          ...Object.fromEntries(screen.components.map(({ id }) => [valueKey(screen.id, id, "$now"), at])),
          ...(host ? { [mediaHostKey]: host } : {}),
        };
  return {
    valuesOf,
    resetValues: () => {
      initial = initialValues(screen, defs, now);
    },
  };
}

export function createControllerContext(options: RuntimeOptions, standalone = false) {
  const { defs, now = Date.now, touchNow = monotonicNow, store = createInteractionStore() } = options;
  const screen = controllerScreen(options, standalone);
  const { parts: disabledParts, ...disabledRegistry } = createDisabledParts();
  const attachmentEntries: AttachmentEntries = new Map();
  const status = {
    disposed: false,
    openSheet: standalone ? undefined : (store.get(`${screen.id}/$sheet`) as string | undefined),
    confirmation: store.get(`${screen.id}/$confirmation`) as Confirmation | undefined,
  };
  const { valuesOf, resetValues } = createValues(options, screen, store, now, standalone, attachmentEntries);
  const host = createHostProjection(options, screen, standalone, now, valuesOf, disabledParts, () =>
    store.setMany({}),
  );
  const { withPolicy, ...projection } = host;
  return {
    standalone,
    options,
    screen,
    defs,
    now,
    touchNow,
    store,
    micCapture: createMicCapture(options.micCapture, (address) => relativeAddress(screen.id, address)),
    clipboard: createClipboard(options, store, () => status.disposed),
    status,
    valuesOf,
    ...projection,
    confirmationFor: (data = options.deviceData, at = now()) =>
      status.confirmation && host.admitted()
        ? visibleConfirmation(withPolicy(valuesOf(at)), defs, status.confirmation, data, at, valuesOf)
        : undefined,
    expiredProgress: (values: Values, at = now()) => expiredProgress(screen, defs, values, at),
    resetValues,
    mounted: new Map<string, symbol>(),
    hold: { parts: new Map<string, symbol>(), approval: undefined as symbol | undefined },
    anchors: new Map<string, (action: "focus" | "jump") => void>(),
    disabledParts,
    attachmentEntries,
    disabledRegistry,
    privateMarks: createPrivateMarks(),
    key: (id: string, part: string) => valueKey(screen.id, id, part),
    relative: (address: string) => relativeAddress(screen.id, address),
    sourceOf: (id: string) => screen.components.find((entry) => entry.id === id),
    inputOf: (entry: ScreenComponent) => entryInput(defs, entry),
    notifyChange() {
      const { onChange, deviceData: data } = options;
      if (!onChange || !host.admitted()) return;
      const updated = projectScreen(screen, defs, valuesOf(), now(), status.openSheet, true, true, data);
      onChange(updated, store.snapshot());
    },
  };
}
export type ControllerContext = ReturnType<typeof createControllerContext>;

function entryInput(
  defs: ControllerOptions["defs"],
  { id: _id, c, state: _state, ...input }: ScreenComponent,
) {
  return defs[c]!.props.parse(input) as Values;
}
