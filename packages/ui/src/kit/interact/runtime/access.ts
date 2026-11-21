import {
  atDeviceTime,
  wordsFor,
  affordancesOf,
  clockControlDeclared,
  driveAffordances,
  driveTarget,
  hostOnlyAddresses,
  hostActionPolicy,
  isPlaybackAction,
  liveProps,
  parseControlProps,
  privateMarkKey,
  projectDeviceData,
  projectSelectionBinding,
  recordClockOffer,
  reportEditWire,
  selectionBindingFor,
  sessionEvent,
  withDisabledSelectionChecks,
  withRecordScreen,
} from "../../../catalog";
import type { AppCurrency, StateName } from "../../../catalog";
import { actionFailure } from "../actions";
import { createControllerContext, type ControllerContext, type ControllerOptions } from "./context";
import { createAct, discardHiddenConfirmation } from "./dispatch";
import { createMediaRuntime } from "./media";
import { drivenPartBlock } from "./planning";
import { commandForConfirmation } from "./host";
import { privateMarkRegistration } from "./private-mark";
import { isKeypad, readControls } from "./read-controls";
type Act = ReturnType<typeof createAct>;
const pressActions = [
  "press",
  "select",
  "toggle",
  "check",
  "increment",
  "decrement",
  "start",
  "stop",
  "send",
  "dismiss",
];
function actionsAt(
  ctx: ControllerContext,
  address: string,
  includeBlocked = false,
  ignoreDisabledPart = false,
): string[] {
  const local = ctx.relative(address),
    id = local.split("/")[0]!;
  if (ctx.status.disposed || (!ignoreDisabledPart && ctx.disabledParts.has(local))) return [];
  if (ctx.privateMarks.has(local) || ctx.store.get(privateMarkKey(ctx.screen.id, local))) return [];
  if (ctx.confirmationFor()) {
    if (local === "confirm/confirm") return ["press"];
    return ["confirm/cancel", "confirm/close"].includes(local) ? ["dismiss"] : [];
  }
  const now = ctx.now();
  const values = ctx.valuesOf(now);
  const sheet = ctx.status.openSheet;
  const visible = ctx.liveScreen(values, sheet, Boolean(sheet), now);
  const screen = withDisabledSelectionChecks(visible, ctx.disabledParts);
  const entry = screen.components.find((item) => item.id === id);
  const def = entry && ctx.defs[entry.c];
  if (!entry || !def) return [];
  const { draw, emptyActions, errorActions, loadingActions, session, successActions } = def.meta;
  const stateActions =
    draw ||
    emptyActions?.length ||
    errorActions?.length ||
    loadingActions?.length ||
    session ||
    successActions?.length;
  if (entry.state && entry.state !== "filled" && !stateActions) return [];
  try {
    const localValues = Object.fromEntries(
      Object.entries(values).map(([key, value]) => [key.replace(`${ctx.screen.id}/`, ""), value]),
    );
    const { id: _id, c: _c, state: _state, ...raw } = entry;
    const get = (part: string) => localValues[`${id}/${part}`];
    const projected = projectDeviceData(ctx.options.deviceData, values);
    const data = withRecordScreen(atDeviceTime(projected, now), ctx.screen);
    const live = liveProps(def.meta, parseControlProps(def, raw, get), id, localValues, true, data);
    const selection = selectionBindingFor(screen, ctx.defs, def.meta, id, localValues, data);
    const props = projectSelectionBinding(def.meta, live, selection?.view);
    const clock = recordClockOffer(def, raw, props, get, data, now, values);
    const wire = reportEditWire(def, raw, get);
    const state = (props.state as StateName | undefined) ?? entry.state;
    const offerContext = { data, clock, wire, schema: def.props, host: screen[hostActionPolicy] };
    const offered = affordancesOf(def.meta, props, id, localValues, state, includeBlocked, offerContext);
    if (hostOnlyAddresses(def, id, offered)?.has(local)) return [];
    const canDrive = (part: string) => !drivenPartBlock(ctx, part);
    const target = driveTarget(def.meta, screen, ctx.defs, localValues, data, canDrive);
    return driveAffordances(def.meta, props, id, offered, target)
      .filter((item) => item.address === local)
      .map((item) => item.action);
  } catch {
    return [];
  }
}
function press(ctx: ControllerContext, act: Act, address: string) {
  const local = ctx.relative(address);
  if (!ctx.status.disposed && ctx.options.interactive !== false) discardHiddenConfirmation(ctx);
  if (ctx.confirmationFor()) {
    if (!["confirm/confirm", "confirm/cancel", "confirm/close"].includes(local))
      return actionFailure(0, "not_actionable", "Answer the confirmation first");
    return act({
      address: local === "confirm/confirm" ? local : "confirm/cancel",
      action: local === "confirm/confirm" ? "press" : "dismiss",
    });
  }
  const offered = actionsAt(ctx, address, true);
  const tap = offered.find((item) => isPressAction(ctx, local, item));
  const action =
    tap ??
    (local.endsWith("/play") && offered.includes("play")
      ? ctx.store.get(ctx.key(local.split("/")[0]!, "play"))
        ? "pause"
        : "play"
      : undefined);
  return action
    ? act({ address, action })
    : actionFailure(0, "not_actionable", "No press action at this address");
}
function isPressAction(ctx: ControllerContext, local: string, action: string) {
  if (pressActions.includes(action)) return true;
  if (action !== "flip" && !isPlaybackAction(action)) return false;
  const [id, ...parts] = local.split("/");
  const entry = ctx.sourceOf(id!);
  const meta = entry && ctx.defs[entry.c]?.meta;
  const target = parts.join("/") || "root";
  return Boolean(
    meta &&
    (action === "flip" ? sessionEvent(meta, target, action) : clockControlDeclared(meta, target, action)),
  );
}
function read(ctx: ControllerContext, currency?: AppCurrency) {
  const { lang, deviceData } = ctx.options;
  const { cancelLabel, confirmLabel, mediaUnavailable } = wordsFor(lang);
  const confirmation = ctx.confirmationFor();
  if (confirmation) {
    const accept =
      commandForConfirmation(confirmation)?.request.kind === "external"
        ? "(user confirmation required)"
        : `[confirm/confirm press] ${JSON.stringify(confirmLabel)}`;
    return `screen ${ctx.screen.id}\nconfirm ${JSON.stringify(confirmation.message)} ${accept} [confirm/cancel dismiss] ${JSON.stringify(cancelLabel)}`;
  }
  const now = ctx.now();
  const values = ctx.valuesOf(now);
  const sheet = ctx.status.openSheet;
  const visible = ctx.liveScreen(values, sheet, Boolean(sheet), now);
  const data = atDeviceTime(deviceData, now);
  const canDrive = ctx.standalone ? undefined : (part: string) => !drivenPartBlock(ctx, part);
  const reading = readControls(
    visible,
    ctx.defs,
    values,
    lang,
    ctx.disabledParts,
    data,
    currency,
    canDrive,
    ctx.privateMarks,
  );
  if (ctx.standalone) return reading;
  return [
    reading,
    ...visible.components
      .filter((entry) => ctx.store.get(ctx.key(entry.id, "error")))
      .map((entry) => `${entry.id} ${mediaUnavailable}`),
  ].join("\n");
}
function registerPart(parts: Map<string, symbol>, local: string) {
  const token = Symbol(local);
  parts.set(local, token);
  return () => {
    if (parts.get(local) === token) parts.delete(local);
  };
}
export function createStandaloneAccess(options: ControllerOptions, currency?: AppCurrency) {
  const ctx = createControllerContext(options, true);
  return { act: createAct(ctx, createMediaRuntime(ctx), () => {}), read: () => read(ctx, currency) };
}
export function createAccess(ctx: ControllerContext, act: Act, currency?: AppCurrency) {
  return {
    actionsAt: (address: string, options?: { ignoreDisabledPart?: boolean }) =>
      actionsAt(ctx, address, false, options?.ignoreDisabledPart),
    press: (address: string) => press(ctx, act, address),
    read: () => read(ctx, currency),
    canPress: (address: string) =>
      actionsAt(ctx, address).some((action) => isPressAction(ctx, ctx.relative(address), action)) ||
      (address.endsWith("/play") && actionsAt(ctx, address).includes("play")),
    edit(address: string, text: string) {
      const result = act({ address, action: "type", value: text });
      if (!result.ok && result.code === "invalid_value") {
        const full = `${ctx.screen.id}/${ctx.relative(address)}`;
        if (!isKeypad(ctx, full))
          ctx.store.setMany({
            [`${full}/$draft`]: text,
            [`${full}/$error`]: result.hint ?? wordsFor(ctx.options.lang).checkValue,
          });
      }
      return result;
    },
    registerPart: (address: string) => registerPart(ctx.mounted, ctx.relative(address)),
    registerDisabledPart: (address: string) => registerPart(ctx.disabledParts, ctx.relative(address)),
    registerPrivateMarkPart: privateMarkRegistration(ctx, act),
  };
}
