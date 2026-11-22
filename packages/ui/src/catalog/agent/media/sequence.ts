import type { Meta } from "../../meta";
import type { Values } from "../act";
import type { Affordance } from "../affordances";
import { visibleItems } from "../visibility";

export const sequenceKey = "$sequence";
type Get = (part: string) => unknown;
export type SequenceState = { index: number; since?: number; elapsedMs?: number };
type SequenceOffer = {
  index: number;
  min?: number | undefined;
  max: number;
  since?: number | undefined;
  elapsedMs?: number | undefined;
  interval?: number | undefined;
  implicit?: number | undefined;
  action: "seek" | "play" | "pause" | "stop" | "increment" | "decrement";
};

export function sequenceState(meta: Meta, props: Values, get: Get) {
  const spec = meta.sequence;
  if (!spec) return;
  const rows = visibleItems(meta, props);
  const min = spec.first ?? 0;
  const count = typeof spec.count === "string" ? props[spec.count] : (spec.count ?? rows.length);
  const max = min + (Number.isSafeInteger(count) && Number(count) > 0 ? Number(count) - 1 : -1);
  const saved = get(sequenceKey) as SequenceState | undefined;
  const seed = props[spec.cursor];
  const interval = spec.controls?.intervalMs;
  const start = spec.controls?.start;
  const auto = start === true || Boolean(start && props[start.prop] === start.equals);
  const index = Math.max(
    min,
    Math.min(max, saved?.index ?? (Number.isSafeInteger(seed) ? Number(seed) : min)),
  );
  const since =
    max >= min && interval && Number.isSafeInteger(interval) && interval > 0 ? saved?.since : undefined;
  return { rows, min, max, index, since, interval, auto, elapsedMs: saved?.elapsedMs };
}

export function sequenceAffordance(
  meta: Meta,
  props: Values,
  instance: string,
  offer: Affordance,
  get: Get,
): Affordance[] {
  const spec = meta.sequence;
  const state = sequenceState(meta, props, get);
  if (!spec || !state) return [offer];
  const target = offer.address.slice(instance.length + 1) || "root";
  const { action } = offer;
  const own = target === spec.seek;
  const row = spec.item && target !== offer.part && spec.item === offer.part;
  const control = target === spec.controls?.part;
  const { index, min, max, since, rows } = state;
  if ((action === (spec.seekAction ?? "seek") && own) || (action === "seek" && row)) {
    const implicit = own ? undefined : min + rows.findIndex(({ id }) => String(id) === target.split("/")[0]);
    if (max < min || (implicit !== undefined && (implicit < min || implicit > max))) return [];
    return [
      {
        ...offer,
        detail: implicit === undefined ? ` = ${index}; range ${min}..${max}` : `:${implicit}`,
        sequence: { action: "seek", index, min, max, since, implicit },
      },
    ];
  }
  const step = sequenceStep(spec, target, action);
  if (step) {
    if (max < min || (step === "increment" ? index === max : index === min)) return [];
    const detail = action === "press" ? (step === "increment" ? ":next" : ":previous") : ` = ${index}`;
    return [{ ...offer, detail, sequence: { action: step, index, min, max, since } }];
  }
  if (!control || (action !== "play" && action !== "pause" && action !== "stop")) return [offer];
  if (max < min || !Number.isSafeInteger(state.interval) || state.interval! <= 0) return [];
  if (action === "pause" ? since === undefined : action === "play" && since !== undefined) return [];
  return [
    {
      ...offer,
      detail: since === undefined ? ":paused" : ":playing",
      sequence: { action, index, min, max, since, interval: state.interval, elapsedMs: state.elapsedMs },
    },
  ];
}

function sequenceStep(spec: NonNullable<Meta["sequence"]>, target: string, action: string) {
  if (target === spec.steps?.next && action === "press") return "increment";
  if (target === spec.steps?.previous && action === "press") return "decrement";
  if (action === "increment" && (target === spec.seek || target === spec.steps?.next)) return action;
  if (action === "decrement" && (target === spec.seek || target === spec.steps?.previous)) return action;
}

export function stageSequence(offer: SequenceOffer, value: unknown, now: number): SequenceState {
  const { index, since } = offer;
  switch (offer.action) {
    case "seek":
      return { index: Number(value), ...(since === undefined ? {} : { since: now }) };
    case "increment":
    case "decrement":
      return {
        index: index + (offer.action === "increment" ? 1 : -1),
        ...(since === undefined ? {} : { since: now }),
      };
    case "play":
      return { index, since: now - (offer.elapsedMs ?? 0) };
    case "pause": {
      const elapsed = Math.max(0, now - since!);
      const interval = offer.interval!;
      const cursor = index + Math.floor(elapsed / interval);
      return cursor > offer.max ? { index: offer.max } : { index: cursor, elapsedMs: elapsed % interval };
    }
    case "stop":
      return { index: offer.min ?? 0 };
  }
}

export function projectSequence(meta: Meta, props: Values, get: Get) {
  const spec = meta.sequence;
  const sequence = sequenceState(meta, props, get);
  return spec && sequence
    ? { ...props, [spec.cursor]: sequence.index, sequencePlaying: sequence.since !== undefined }
    : props;
}

export type SeekLimits = { min?: number | undefined; max: number; implicit?: number | undefined };
export function validateSequenceSeek(value: unknown, limits: SeekLimits) {
  const invalid = (hint: string) => ({ code: "invalid_value" as const, hint });
  if (limits.implicit !== undefined)
    return value === undefined || value === limits.implicit
      ? null
      : invalid("Use this item's index or no value");
  const min = limits.min ?? 0;
  return typeof value === "number" && Number.isSafeInteger(value) && value >= min && value <= limits.max
    ? null
    : invalid(`Use an integer from ${min} to ${limits.max}`);
}
