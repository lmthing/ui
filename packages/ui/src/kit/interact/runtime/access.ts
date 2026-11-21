import {
  atDeviceTime,
  wordsFor,
  clockControlDeclared,
  isPlaybackAction,
  sessionEvent,
} from "../../../catalog";
import type { AppCurrency, StateName } from "../../../catalog";
import { actionFailure } from "../actions";
import { createControllerContext, type ControllerContext, type ControllerOptions } from "./context";
import { createAct, discardHiddenConfirmation } from "./dispatch";
import { createMediaRuntime } from "./media";
import { registerPart } from "./part-registration";
import { drivenPartBlock } from "./planning";
import { actionsAt } from "./offers";
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
  "copy",
  "dismiss",
];
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
export function createStandaloneAccess(options: ControllerOptions, currency?: AppCurrency, full = false) {
  const ctx = createControllerContext(options, !full);
  return { act: createAct(ctx, createMediaRuntime(ctx), () => {}), read: () => read(ctx, currency) };
}
export function createAccess(ctx: ControllerContext, act: Act, currency?: AppCurrency) {
  return {
    registerCopyTarget: ctx.clipboard.register,
    copiedAt: ctx.clipboard.copiedAt,
    actionsAt: (address: string, options?: { ignoreDisabledPart?: boolean }) =>
      actionsAt(ctx, address, false, options?.ignoreDisabledPart),
    press: (address: string) => press(ctx, act, address),
    read: () => read(ctx, currency),
    canPress(address: string, options?: { ignoreDisabledPart?: boolean }) {
      const offered = actionsAt(ctx, address, false, options?.ignoreDisabledPart);
      return (
        offered.some((action) => isPressAction(ctx, ctx.relative(address), action)) ||
        (address.endsWith("/play") && offered.includes("play"))
      );
    },
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
