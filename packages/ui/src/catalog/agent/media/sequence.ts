import type { Meta } from "../../meta";
import type { Values } from "../act";
import type { Affordance } from "../affordances";
import { visibleItems } from "../visibility";

export const sequenceKey = "$sequence";
type Get = (part: string) => unknown;
export type SequenceState = { index: number; since?: number; elapsedMs?: number };
type SequenceOffer = {
  index: number;
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
  const max = rows.length - 1;
  const saved = get(sequenceKey) as SequenceState | undefined;
  const seed = props[spec.cursor];
  const interval = spec.controls?.intervalMs;
  const index = Math.max(0, Math.min(max, saved?.index ?? (Number.isSafeInteger(seed) ? Number(seed) : 0)));
  const since =
    max >= 0 && interval && Number.isSafeInteger(interval) && interval > 0 ? saved?.since : undefined;
  return { rows, max, index, since, interval, elapsedMs: saved?.elapsedMs };
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
  const { index, max, since, rows } = state;
  if (action === "seek" && (own || row)) {
    const implicit = own ? undefined : rows.findIndex(({ id }) => String(id) === target.split("/")[0]);
    if (max < 0 || implicit === -1) return [];
    return [
      {
        ...offer,
        detail: implicit === undefined ? ` = ${index}; range 0..${max}` : `:${implicit}`,
        sequence: { action, index, max, since, implicit },
      },
    ];
  }
  if (
    (action === "increment" && (own || target === spec.steps?.next)) ||
    (action === "decrement" && (own || target === spec.steps?.previous))
  ) {
    if (max < 0 || (action === "increment" ? index === max : index === 0)) return [];
    return [{ ...offer, detail: ` = ${index}`, sequence: { action, index, max, since } }];
  }
  if (!control || (action !== "play" && action !== "pause" && action !== "stop")) return [offer];
  if (max < 0 || !Number.isSafeInteger(state.interval) || state.interval! <= 0) return [];
  if (action === "pause" ? since === undefined : action === "play" && since !== undefined) return [];
  return [
    {
      ...offer,
      detail: since === undefined ? ":paused" : ":playing",
      sequence: { action, index, max, since, interval: state.interval, elapsedMs: state.elapsedMs },
    },
  ];
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
      return { index: 0 };
  }
}

export function projectSequence(meta: Meta, props: Values, get: Get) {
  const spec = meta.sequence;
  const sequence = sequenceState(meta, props, get);
  return spec && sequence
    ? { ...props, [spec.cursor]: sequence.index, sequencePlaying: sequence.since !== undefined }
    : props;
}

export type SeekLimits = { max: number; implicit?: number };
export function validateSequenceSeek(value: unknown, limits: SeekLimits) {
  const invalid = (hint: string) => ({ code: "invalid_value" as const, hint });
  if (limits.implicit !== undefined)
    return value === undefined || value === limits.implicit
      ? null
      : invalid("Use this item's index or no value");
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= limits.max
    ? null
    : invalid(`Seek takes an integer from 0 to ${limits.max}`);
}
