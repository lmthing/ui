import {
  atDeviceTime,
  clockControlDeclared,
  isPlaybackAction,
  sessionEvent,
  wordsFor,
  type AppCurrency,
} from "../../../catalog";
import { actionFailure } from "../actions";
import { createControllerContext, type ControllerContext, type ControllerOptions } from "./context";
import { createAct, discardHiddenConfirmation } from "./dispatch";
import { createMediaRuntime } from "./media";
import { driveAccess } from "./planning";
import { privateMarkRegistration } from "./private-mark";
import { isKeypad, readControls } from "./read-controls";
import { numericControlAt, offersAt } from "./offers";
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
) {
  return offersAt(ctx, address, includeBlocked, ignoreDisabledPart).map(({ action }) => action);
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
  if (confirmation)
    return `screen ${ctx.screen.id}\nconfirm ${JSON.stringify(confirmation.message)} [confirm/confirm press] ${JSON.stringify(confirmLabel)} [confirm/cancel dismiss] ${JSON.stringify(cancelLabel)}`;
  const now = ctx.now();
  const values = ctx.valuesOf(now);
  const sheet = ctx.status.openSheet;
  const visible = ctx.liveScreen(values, sheet, Boolean(sheet), now);
  const data = atDeviceTime(deviceData, now);
  const canDrive = ctx.standalone ? undefined : driveAccess(ctx);
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
function registerPart<T>(parts: Map<string, T>, local: string, registration: T, refresh: () => void) {
  const existed = parts.has(local);
  parts.set(local, registration);
  if (!existed) refresh();
  return () => {
    if (parts.get(local) !== registration) return;
    parts.delete(local);
    refresh();
  };
}

function driveRefresh(ctx: ControllerContext) {
  const bound = ctx.screen.components.some(({ c }) => typeof ctx.defs[c]?.meta.drives === "object");
  let pending = false;
  return () => {
    if (!bound || pending || ctx.status.disposed) return;
    pending = true;
    queueMicrotask(() => {
      pending = false;
      if (!ctx.status.disposed) ctx.store.setMany({});
    });
  };
}
export function createStandaloneAccess(options: ControllerOptions, currency?: AppCurrency) {
  const ctx = createControllerContext(options, true);
  return { act: createAct(ctx, createMediaRuntime(ctx), () => {}), read: () => read(ctx, currency) };
}
export function createAccess(ctx: ControllerContext, act: Act, currency?: AppCurrency) {
  const refresh = driveRefresh(ctx);
  return {
    actionsAt: (address: string, options?: { ignoreDisabledPart?: boolean }) =>
      actionsAt(ctx, address, false, options?.ignoreDisabledPart),
    numericControl: (address: string) => numericControlAt(ctx, address),
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
    registerPart: (address: string) =>
      registerPart(ctx.mounted, ctx.relative(address), Symbol(address), refresh),
    registerAnchor: (address: string, handler: (action: "focus" | "jump") => void) =>
      registerPart(ctx.anchors, ctx.relative(address), handler, refresh),
    registerDisabledPart: (address: string) =>
      registerPart(ctx.disabledParts, ctx.relative(address), Symbol(address), refresh),
    registerPrivateMarkPart: privateMarkRegistration(ctx, act),
  };
}
