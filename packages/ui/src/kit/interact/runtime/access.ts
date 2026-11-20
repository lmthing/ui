import {
  wordsFor,
  affordancesOf,
  clockControlDeclared,
  isPlaybackAction,
  liveProps,
  parseAddress,
  parseControlProps,
  sessionEvent,
} from "../../../catalog";
import type { ActStep, StateName } from "../../../catalog";
import { actionFailure } from "../actions";
import type { ActReply } from "../index";
import { createControllerContext, type ControllerContext, type ControllerOptions } from "./context";
import { createAct } from "./dispatch";
import { createMediaRuntime } from "./media";
import { readControls } from "./read-controls";
type Act = (step: ActStep) => ActReply;
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
  if (ctx.status.confirmation)
    return local === "confirm/confirm"
      ? ["press"]
      : ["confirm/cancel", "confirm/close"].includes(local)
        ? ["dismiss"]
        : [];
  const now = ctx.now();
  const values = ctx.valuesOf(now);
  const entry = ctx
    .liveScreen(values, ctx.status.openSheet, Boolean(ctx.status.openSheet), now)
    .components.find((item) => item.id === id);
  const def = entry && ctx.defs[entry.c];
  if (!entry || !def) return [];
  const { draw, emptyActions, errorActions, session, successActions } = def.meta;
  if (
    entry.state &&
    entry.state !== "filled" &&
    !draw &&
    !emptyActions?.length &&
    !errorActions?.length &&
    !session &&
    !successActions?.length
  )
    return [];
  try {
    const localValues = Object.fromEntries(
      Object.entries(values).map(([key, value]) => [key.replace(`${ctx.screen.id}/`, ""), value]),
    );
    const { id: _id, c: _c, state: _state, ...raw } = entry;
    const parsed = parseControlProps(def, raw, (part) => localValues[`${id}/${part}`]);
    const props = liveProps(def.meta, parsed, id, localValues, true);
    return affordancesOf(
      def.meta,
      props,
      id,
      localValues,
      (props.state as StateName | undefined) ?? entry.state,
      includeBlocked,
    )
      .filter((item) => item.address === local)
      .map((item) => item.action);
  } catch {
    return [];
  }
}
function press(ctx: ControllerContext, act: Act, address: string) {
  const local = ctx.relative(address);
  if (ctx.status.confirmation) {
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
function read(ctx: ControllerContext) {
  const { cancelLabel, confirmLabel, mediaUnavailable } = wordsFor(ctx.options.lang);
  if (ctx.status.confirmation)
    return `screen ${ctx.screen.id}\nconfirm ${JSON.stringify(ctx.status.confirmation.message)} [confirm/confirm press] ${JSON.stringify(confirmLabel)} [confirm/cancel dismiss] ${JSON.stringify(cancelLabel)}`;
  const visible = ctx.liveScreen(ctx.valuesOf(), ctx.status.openSheet, Boolean(ctx.status.openSheet));
  const reading = readControls(
    visible,
    ctx.defs,
    ctx.valuesOf(),
    ctx.options.lang,
    ctx.disabledParts,
    ctx.options.deviceData,
  );
  if (ctx.standalone) return reading;
  return [
    reading,
    ...visible.components
      .filter((entry) => ctx.store.get(ctx.key(entry.id, "error")))
      .map((entry) => `${entry.id} ${mediaUnavailable}`),
  ].join("\n");
}
function isKeypad(ctx: ControllerContext, full: string) {
  const address = parseAddress(full);
  const entry = address?.component && ctx.sourceOf(address.component);
  const parts = entry ? ctx.defs[entry.c]?.props.meta()?.keypadParts : undefined;
  return Array.isArray(parts) && parts.includes(address?.part ?? "root");
}

export function createStandaloneAccess(options: ControllerOptions) {
  const ctx = createControllerContext(options, true);
  return { act: createAct(ctx, createMediaRuntime(ctx), () => {}), read: () => read(ctx) };
}

export function createAccess(ctx: ControllerContext, act: Act) {
  return {
    actionsAt: (address: string, options?: { ignoreDisabledPart?: boolean }) =>
      actionsAt(ctx, address, false, options?.ignoreDisabledPart),
    press: (address: string) => press(ctx, act, address),
    read: () => read(ctx),
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
    registerPart(address: string) {
      const local = ctx.relative(address),
        token = Symbol(local);
      ctx.mounted.set(local, token);
      return () => {
        if (ctx.mounted.get(local) === token) ctx.mounted.delete(local);
      };
    },
    registerDisabledPart(address: string) {
      const local = ctx.relative(address),
        token = Symbol(local);
      ctx.disabledParts.set(local, token);
      return () => {
        if (ctx.disabledParts.get(local) === token) ctx.disabledParts.delete(local);
      };
    },
  };
}
