import {
  createControllerContext,
  createClock,
  createSequenceClock,
  controllerLifecycle,
  createMediaRuntime,
  createAct,
  createAccess,
  createPrivateControls,
  privateMarkRegistration,
  discardHiddenConfirmation,
  bindParentGatePart,
  type ControllerContext,
  type ControllerOptions,
} from "./runtime";
export type { Confirmation } from "./runtime";
import { projectScreen } from "./live-screen";
import {
  atDeviceTime,
  driveTarget,
  emptyDeviceData,
  isRecordJournal,
  liveProps,
  parseAppCurrency,
  projectDeviceData,
  projectDriveObservation,
  projectSelectionBinding,
  selectDeviceData,
  selectionBindingFor,
  withDisabledSelectionChecks,
  withRecordScreen,
  type AppCurrency,
  type Meta,
  type Values,
} from "../../catalog";

function liveControls(ctx: ControllerContext, meta: Meta, props: Values, component: string) {
  const prefix = `${ctx.screen.id}/`;
  const now = ctx.now();
  const values = ctx.valuesOf(now);
  const local = Object.fromEntries(
    Object.entries(values)
      .filter(([key]) => key.startsWith(prefix) || isRecordJournal(key))
      .map(([key, value]) => [key.startsWith(prefix) ? key.slice(prefix.length) : key, value]),
  );
  const definition = ctx.defs[meta.id]?.meta ?? meta;
  const data = withRecordScreen(
    atDeviceTime(projectDeviceData(ctx.options.deviceData, values), now),
    ctx.screen,
  );
  const live = liveProps(definition, props, component, local, true, data);
  if (!definition.selectionBinding && typeof definition.drives !== "object") return live;
  const sheet = ctx.status.openSheet;
  const visible = ctx.liveScreen(values, sheet, Boolean(sheet), now);
  const screen = withDisabledSelectionChecks(visible, ctx.disabledParts);
  const selection = selectionBindingFor(screen, ctx.defs, definition, component, local, data);
  const target = driveTarget(
    definition,
    screen,
    ctx.defs,
    local,
    data,
    (part) => !ctx.privateMarks.has(part),
  );
  return projectDriveObservation(
    definition,
    projectSelectionBinding(definition, live, selection?.view),
    component,
    target,
  );
}

function deviceDataFor(ctx: ControllerContext, component: string, data = ctx.options.deviceData) {
  const source = ctx.sourceOf(component);
  const def = source && ctx.defs[source.c];
  return def ? selectDeviceData(def.meta, projectDeviceData(data, ctx.valuesOf())) : emptyDeviceData;
}

function hostCommandsAt(ctx: ControllerContext, component: string, part: string, item: boolean) {
  const entry = ctx.sourceOf(component);
  const commands = entry && ctx.defs[entry.c]?.meta.hostCommands;
  return Object.keys((item ? commands?.items : commands?.parts) ?? {}).some((key) =>
    key.startsWith(`${part}.`),
  );
}

/** One dispatcher for human taps and agent steps. Hidden sheets and covered controls are not actionable. */
export function createScreenController(options: ControllerOptions & { currency?: AppCurrency | undefined }) {
  const currency = parseAppCurrency(options.currency);
  const ctx = createControllerContext(options);
  const clock = createClock(ctx, () => discardHiddenConfirmation(ctx));
  const media = createMediaRuntime(ctx);
  const secrets = createPrivateControls(ctx);
  const sequence = createSequenceClock(ctx);
  const lifecycle = controllerLifecycle(ctx, clock, media, secrets, sequence);
  const dispatch = createAct(ctx, media, lifecycle.schedule);
  const act = secrets.dispatch(dispatch);
  const access = createAccess(ctx, act, currency, secrets.revoke);
  return {
    defs: ctx.defs,
    store: ctx.store,
    get currency() {
      return currency;
    },
    act,
    get admitted() {
      return ctx.admitted();
    },
    bindParentGatePart: (address: string, destination: string) =>
      bindParentGatePart(ctx, address, destination),
    hostOperationVersion: ctx.hosts.version,
    hasHostCommandsAt: (component: string, part: string, item: boolean) =>
      hostCommandsAt(ctx, component, part, item),
    hostOperations: (id: string) => {
      const { operation } = ctx.hosts.policy(ctx.valuesOf());
      return ctx.subjects(id).flatMap((subject) => operation?.(subject) ?? []);
    },
    mountMedia: media.mountMedia,
    activeMedia: media.activeMedia,
    attachmentReference: media.attachmentReference,
    ...access,
    registerPart: lifecycle.registerPart(access.registerPart),
    registerPrivateMarkPart: privateMarkRegistration(ctx, dispatch),
    ...secrets.view,
    deviceDataFor: (component: string, data = options.deviceData) => deviceDataFor(ctx, component, data),
    get deviceData() {
      return options.deviceData;
    },
    liveControls: (meta: Meta, props: Values, component: string) => liveControls(ctx, meta, props, component),
    ...lifecycle.view,
    get openSheet() {
      return ctx.status.openSheet;
    },
    get confirmation() {
      return ctx.confirmationFor();
    },
    confirmationFor: ctx.confirmationFor,
  };
}
export type ScreenController = ReturnType<typeof createScreenController>;
