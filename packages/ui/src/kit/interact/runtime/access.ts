import {
  atDeviceTime,
  wordsFor,
  clockControlDeclared,
  clipKey,
  isPlaybackAction,
  mediaOffer,
  sessionEvent,
} from "../../../catalog";
import type { AppCurrency } from "../../../catalog";
import { actionFailure } from "../actions";
import { createControllerContext, type ControllerContext, type ControllerOptions } from "./context";
import { createAct, discardHiddenConfirmation } from "./dispatch";
import { createMediaRuntime } from "./media";
import { actionsAt, drivenPartBlock } from "./planning";
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
  if (confirmation)
    return `screen ${ctx.screen.id}\nconfirm ${JSON.stringify(confirmation.message)} [confirm/confirm press] ${JSON.stringify(confirmLabel)} [confirm/cancel dismiss] ${JSON.stringify(cancelLabel)}`;
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
    mediaKeyTarget: (address: string) => mediaKeyTarget(ctx, address),
    canPress: (address: string) => canPress(ctx, address),
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

function canPress(ctx: ControllerContext, address: string) {
  const offered = actionsAt(ctx, address);
  const local = ctx.relative(address);
  return (
    Boolean(clipTap(ctx, local, offered)) ||
    offered.some((action) => isPressAction(ctx, local, action)) ||
    (address.endsWith("/play") && offered.includes("play"))
  );
}
