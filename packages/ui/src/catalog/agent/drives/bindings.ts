import type { DriveBindings, DriveCommand, Meta } from "../../meta";
import { controlsAreValid, selectStep, stageValue, validateStep } from "../action-input";
import { isItemOffer } from "../selection-binding";
import { addressedItems } from "../visibility";
import {
  reportConfirmation,
  partTierAt,
  validateActionValue,
  type ActStep,
  type Affordance,
  type Values,
} from "../index";
import { resolveTarget, siblingEntries, type DriveContext } from "./target";

function destination(ctx: DriveContext, command: DriveCommand, source: string, props: Values) {
  const entries = siblingEntries(ctx, command.to, source, props);
  if (entries.length !== 1) return;
  const { part } = command.to;
  const target = resolveTarget(ctx, entries[0]!, part, command.action, "command");
  if (
    !target?.offer ||
    target.offer.detail.startsWith("→") ||
    ctx.canDrive?.(target.address, undefined, command.action) === false ||
    target.meta.confirmParts?.includes(part) ||
    reportConfirmation(target.meta, part, command.action)
  )
    return;
  return { ...target, offer: target.offer };
}

function payload(
  command: DriveCommand,
  holder: Values,
  target: NonNullable<ReturnType<typeof destination>>,
  values: Values,
) {
  if (!("payload" in command)) return;
  const spec = command.payload;
  const value = "from" in spec ? holder[spec.from] : spec.value;
  if (typeof value !== "string" && typeof value !== "number") return;
  if (command.action !== "type" || !command.append || typeof value !== "string") return value;
  const part = command.to.part;
  const prop = target.meta.live?.text?.[part]?.prop;
  const before = prop ? target.props[prop] : (values[target.address] ?? target.props.value);
  return `${typeof before === "string" ? before : ""}${value}`;
}

function validCommand(ctx: DriveContext, step: ActStep, found: Affordance) {
  const { screen, defs, values, data } = ctx;
  const full = Object.fromEntries(
    Object.entries(values).map(([key, value]) => [`${screen.id}/${key}`, value]),
  );
  const selected = selectStep(screen, defs, step, step.address, full, data);
  if (selected.error) return false;
  const key = `${screen.id}/${step.address}`;
  const { result, edit } = validateStep(screen, defs, found, selected.step, full, key);
  if ("code" in result) return false;
  if (!edit && !selected.declared) return true;
  stageValue(full, key, found, result.value, edit, screen.id, []);
  Object.assign(full, selected.changes);
  return controlsAreValid(screen, defs, step.address, full);
}

export function routeBinding(
  ctx: DriveContext,
  meta: Meta,
  bindings: DriveBindings,
  props: Values,
  id: string,
  offer: Affordance,
) {
  if (offer.action !== "press") return offer;
  const item = isItemOffer(id, offer);
  const command = bindings.commands?.find(
    ({ scope, part }) => part === offer.part && (scope === "item") === item,
  );
  if (!command) return offer;
  if (partTierAt(meta, props, offer.part) !== "phone" || meta.confirmParts?.includes(offer.part)) return;
  const target = destination(ctx, command, id, props);
  if (!target) return;
  const holder = item
    ? addressedItems(meta, props).find((row) => row.id === offer.address.split("/")[1])
    : props;
  if (!holder) return;
  const value = payload(command, holder, target, ctx.values);
  if (
    command.action === "type" &&
    target.meta.id === "Composer" &&
    (typeof value !== "string" || value.length > Number(target.props.max))
  )
    return;
  if (
    command.action === "seek" &&
    typeof target.props.seconds === "number" &&
    Number(value) > target.props.seconds
  )
    return;
  const drive = {
    address: target.address,
    action: command.action,
    ...(value === undefined ? {} : { value }),
  };
  if (!validCommand(ctx, drive, target.offer)) return;
  const readAddress = id === ctx.screen.id ? `${ctx.screen.id}/${offer.address}` : offer.address;
  return { ...offer, detail: "", readAddress, drive };
}

export function observePlayback(
  ctx: DriveContext,
  binding: NonNullable<DriveBindings["observe"]>,
  id: string,
  props: Values,
) {
  const entries = siblingEntries(ctx, binding.from, id, props);
  if (entries.length !== 1) return props;
  const target = resolveTarget(ctx, entries[0]!, binding.from.part, "seek", "observe");
  if (!target || ctx.canDrive?.(target.address, true) === false) return props;
  const at = ctx.values[target.address] ?? target.props.at ?? 0;
  if (
    validateActionValue("seek", at) ||
    (typeof target.props.seconds === "number" && Number(at) > target.props.seconds)
  )
    return props;
  return {
    ...props,
    [binding.at]: at,
    ...(binding.playing ? { [binding.playing]: target.get("play") === true } : {}),
  };
}
