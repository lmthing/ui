import {
  atDeviceTime,
  type AppCurrency,
  wordsFor,
  clockControlDeclared,
  clipKey,
  isPlaybackAction,
  mediaOffer,
  sessionEvent,
} from "../../../catalog";
import { actionFailure } from "../actions";
import { createControllerContext, type ControllerContext, type ControllerOptions } from "./context";
import { createAct, discardHiddenConfirmation } from "./dispatch";
import { createMediaRuntime } from "./media";
import { driveRefresh, registerEntry, registerPart } from "./part-registration";
import { driveAccess } from "./planning";
import { actionsAt, numericControlAt } from "./offers";
import { commandForConfirmation } from "./host";
import { isKeypad, readControls } from "./read-controls";
type Act = ReturnType<typeof createAct>;
const pressActions = "press select toggle check increment decrement start stop send copy dismiss".split(" ");
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
  const tap = clipTap(ctx, local, offered) ?? offered.find((item) => isPressAction(ctx, local, item));
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
  const [id, ...parts] = local.split("/");
  const entry = ctx.sourceOf(id!);
  const meta = entry && ctx.defs[entry.c]?.meta;
  const target = parts.join("/") || "root";
  const part = parts.at(-1) ?? "root";
  if (!meta) return false;
  if (action === "scan")
    return [part, "root"].some(
      (name) => mediaOffer(meta, id!, { address: local, part: name, action })?.kind === "attachment",
    );
  if (action === "seek")
    return (
      target !== meta.sequence?.seek &&
      (parts.length === 2
        ? meta.sequence?.item === part
        : meta.sequence?.item === "root" && parts.length === 1)
    );
  if ((action === "play" || action === "pause") && target === meta.sequence?.controls?.part) return true;
  if (action !== "flip" && !isPlaybackAction(action)) return false;
  return Boolean(
    action === "flip" ? sessionEvent(meta, target, action) : clockControlDeclared(meta, target, action),
  );
}
function clipTap(ctx: ControllerContext, address: string, offered: string[]) {
  const [id, ...parts] = address.split("/");
  const entry = ctx.sourceOf(id!);
  const meta = entry && ctx.defs[entry.c]?.meta;
  if (!meta || !offered.includes("play")) return;
  const part = parts.at(-1) ?? "root";
  const offer = { address, part, action: "play" };
  if (
    mediaOffer(meta, id!, offer)?.kind !== "playback" &&
    mediaOffer(meta, id!, { ...offer, part: "root" })?.kind !== "playback"
  )
    return;
  return offered.includes("pause") && ctx.store.get(ctx.key(id!, clipKey(parts.join("/") || "root"))) === true
    ? "pause"
    : "play";
}
function mediaKeyTarget(ctx: ControllerContext, address: string) {
  const local = ctx.relative(address);
  const [id, ...parts] = local.split("/");
  const entry = ctx.sourceOf(id!);
  const meta = entry && ctx.defs[entry.c]?.meta;
  if (!meta) return false;
  const target = parts.join("/") || "root";
  const sequence = meta.sequence;
  if (
    sequence &&
    [sequence.seek, sequence.controls?.part, sequence.steps?.next, sequence.steps?.previous].includes(target)
  )
    return true;
  if (sequence && isPressAction(ctx, local, "seek")) return true;
  return ["press", "scan", "play", "stop"].some((action) =>
    [parts.at(-1) ?? "root", "root"].some((part) => mediaOffer(meta, id!, { address: local, part, action })),
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
export function createStandaloneAccess(options: ControllerOptions, currency?: AppCurrency, full = false) {
  const ctx = createControllerContext(options, !full);
  return { act: createAct(ctx, createMediaRuntime(ctx), () => {}), read: () => read(ctx, currency) };
}
export function createAccess(
  ctx: ControllerContext,
  act: Act,
  currency?: AppCurrency,
  revokeReveal?: (address: string) => void,
) {
  const refresh = driveRefresh(ctx);
  return {
    registerCopyTarget: ctx.clipboard.register,
    copiedAt: ctx.clipboard.copiedAt,
    actionsAt: (address: string, options?: { ignoreDisabledPart?: boolean }) =>
      actionsAt(ctx, address, false, options?.ignoreDisabledPart),
    numericControl: (address: string) => numericControlAt(ctx, address),
    press: (address: string) => press(ctx, act, address),
    read: () => read(ctx, currency),
    mediaKeyTarget: (address: string) => mediaKeyTarget(ctx, address),
    canPress: (address: string, options?: { ignoreDisabledPart?: boolean }) =>
      canPress(ctx, address, options?.ignoreDisabledPart),
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
      registerPart(ctx.mounted, ctx.relative(address), revokeReveal, refresh),
    registerAnchor: (address: string, handler: (action: "focus" | "jump") => void) =>
      registerEntry(ctx.anchors, ctx.relative(address), handler, refresh),
    registerDisabledPart(address: string) {
      const local = ctx.relative(address);
      const remove = registerPart(ctx.disabledParts, local, undefined, refresh);
      revokeReveal?.(local);
      return remove;
    },
  };
}

function canPress(ctx: ControllerContext, address: string, ignoreDisabledPart = false) {
  const offered = actionsAt(ctx, address, false, ignoreDisabledPart);
  const local = ctx.relative(address);
  return (
    Boolean(clipTap(ctx, local, offered)) ||
    offered.some((action) => isPressAction(ctx, local, action)) ||
    (address.endsWith("/play") && offered.includes("play"))
  );
}
