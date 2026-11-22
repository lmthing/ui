import type { Meta } from "../../meta";
import type { StateName } from "../../types";
import { stampItemIds } from "../../lines";
import type { Values } from "../index";
import { drawBatch, initialDeck, type DeckDraw } from "./deck";
import { drawPartition, partitionPlan } from "./partition";
import { randomIndex, type RandomSource } from "./random";

export const drawKey = "$draw";
export type DrawState =
  | { kind: "faces"; faces: readonly number[]; held: readonly boolean[] }
  | { kind: "pick"; index?: number; used: readonly number[]; remaining: number }
  | { kind: "partition"; teams: readonly number[] }
  | DeckDraw;

type Draw = NonNullable<Meta["draw"]>;
type DrawRole = "draw" | "redraw" | "reset" | "hold";
type Get = (part: string) => unknown;
type StoredDraw = Readonly<{ inputs: string; state: DrawState }>;

// Readers receive stamped items while action planning receives the original rows.
function unstamp(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  return value.map((item: unknown) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return item;
    const { id: _id, ...props } = item as Values;
    return props;
  });
}

function inputsFor(draw: Draw, props: Values): string {
  if (draw.kind === "faces") return JSON.stringify([props[draw.count], props[draw.sides]]);
  if (draw.kind === "deck") return JSON.stringify(unstamp(props[draw.pool]));
  if (draw.kind === "pick")
    return JSON.stringify([
      unstamp(props[draw.pool]),
      draw.repeat === undefined || props[draw.repeat] !== false,
    ]);
  return JSON.stringify([unstamp(props[draw.players]), unstamp(props[draw.teams])]);
}

export function storeDraw(meta: Meta, props: Values, state: DrawState): StoredDraw {
  return { inputs: inputsFor(meta.draw!, props), state };
}

function matchingDraw(meta: Meta, props: Values, stored: unknown): DrawState | undefined {
  const draw = meta.draw;
  const record = stored as StoredDraw | undefined;
  return draw && record?.state?.kind === draw.kind && record.inputs === inputsFor(draw, props)
    ? record.state
    : undefined;
}

export function staleDraw(meta: Meta, props: Values, stored: unknown): boolean {
  return stored !== undefined && !matchingDraw(meta, props, stored);
}

const list = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : []);
const repeats = (draw: Extract<Draw, { kind: "pick" }>, props: Values) =>
  draw.repeat === undefined || props[draw.repeat] !== false;
function partition(draw: Extract<Draw, { kind: "partition" }>, props: Values) {
  const teams = props[draw.teams];
  return partitionPlan(
    list(props[draw.players]).map((player) =>
      draw.locked && player && typeof player === "object" ? (player as Values)[draw.locked] : undefined,
    ),
    typeof teams === "number" ? teams : list(teams).length,
  );
}
export function holdIndex(meta: Meta, target: string): number {
  const prefix = meta.items?.prefix ?? "r";
  const [item, part = "root", extra] = target.split("/");
  if (meta.draw?.kind !== "faces" || !meta.draw.hold || part !== meta.draw.hold || extra !== undefined)
    return -1;
  const index = Number(item?.slice(prefix.length));
  return Number.isSafeInteger(index) && index > 0 && item === `${prefix}${index}` ? index - 1 : -1;
}
export function drawRole(meta: Meta, target: string, action: string): DrawRole | undefined {
  const draw = meta.draw;
  if (!draw) return;
  if (action === "toggle" && holdIndex(meta, target) >= 0) return "hold";
  if (action !== "press") return;
  if (target === draw.press) return "draw";
  if (draw.kind === "pick" && target === draw.reset) return "reset";
  if (draw.kind === "deck" && target === draw.reset) return "reset";
  if (draw.kind === "partition" && target === draw.redraw) return "redraw";
}

/** Shared state for the reader and views, including the initial pool size before any press. */
export function drawState(meta: Meta, props: Values, get: Get): DrawState | undefined {
  const draw = meta.draw;
  if (!draw) return;
  const stored = matchingDraw(meta, props, get(drawKey));
  if (stored) return stored;
  if (draw.kind === "pick") return { kind: "pick", used: [], remaining: list(props[draw.pool]).length };
  if (draw.kind === "deck") return initialDeck(list(props[draw.pool]).length);
  if (draw.kind === "faces") return { kind: "faces", faces: [], held: [] };
  return { kind: "partition", teams: [] };
}

export function drawStatus(meta: Meta, props: Values, state: StateName, get: Get): StateName {
  const draw = meta.draw;
  if (!draw || !["filled", "empty", "success"].includes(state)) return state;
  if (draw.kind === "partition" && !partition(draw, props)) return "error";
  const current = drawState(meta, props, get);
  if (current?.kind === "deck")
    return !hasResult(current) ? "empty" : current.remaining === 0 ? "success" : "filled";
  if (state === "empty" && current && hasResult(current)) return "filled";
  return state;
}
function hasResult(state: DrawState): boolean {
  if (state.kind === "faces") return state.faces.length > 0;
  if (state.kind === "partition") return state.teams.length > 0;
  if (state.kind === "deck") return state.drawn.length > 0;
  return state.index !== undefined;
}
export function drawAvailable(meta: Meta, props: Values, get: Get, target: string, role: DrawRole) {
  const draw = meta.draw!;
  const state = drawState(meta, props, get)!;
  if (draw.kind === "faces" && state.kind === "faces") {
    if (role === "hold") return holdIndex(meta, target) < state.faces.length;
    return !hasResult(state) || state.held.some((held) => !held);
  }
  if (draw.kind === "pick" && state.kind === "pick")
    return role === "reset" ? !repeats(draw, props) : state.remaining > 0;
  if (state.kind === "deck") return role === "reset" ? state.discard.length > 0 : state.remaining > 0;
  return draw.kind === "partition" && (draw.redraw === undefined || (role === "redraw") === hasResult(state));
}

export function projectDraw(meta: Meta, props: Values, get: Get): Values {
  const state = drawState(meta, props, get);
  if (!state) return props;
  const key = meta.items?.key;
  const projected = { ...props, [drawKey]: state };
  // Numbered faces have stable item addresses but are not Writer-provided rows.
  if (state.kind !== "faces" || !key) return projected;
  const rows = state.faces.map((_face, index) => ({ held: state.held[index] }));
  return stampItemIds(meta, { ...projected, [key]: rows });
}

export function performDraw(
  meta: Meta,
  props: Values,
  get: Get,
  role: DrawRole,
  target: string,
  value: unknown,
  random: RandomSource,
): DrawState {
  const draw = meta.draw!;
  const state = drawState(meta, props, get)!;
  if (draw.kind === "faces" && state.kind === "faces") {
    if (role === "hold") {
      const index = holdIndex(meta, target);
      return {
        ...state,
        held: state.held.map((held, i) => (i === index ? ((value as boolean | undefined) ?? !held) : held)),
      };
    }
    const held = Array.from({ length: Number(props[draw.count]) }, (_, i) => state.held[i] ?? false);
    const faces = held.map((keep, i) =>
      keep ? state.faces[i]! : randomIndex(Number(props[draw.sides]), random) + 1,
    );
    return { kind: "faces", faces, held };
  }
  if (draw.kind === "pick" && state.kind === "pick") {
    const size = list(props[draw.pool]).length;
    if (role === "reset") return { kind: "pick", used: [], remaining: size };
    const eligible = Array.from({ length: size }, (_, i) => i).filter((i) => !state.used.includes(i));
    const index = eligible[randomIndex(eligible.length, random)]!;
    const used = repeats(draw, props) ? [] : [...state.used, index];
    return { kind: "pick", index, used, remaining: size - used.length };
  }
  if (draw.kind === "partition")
    return { kind: "partition", teams: drawPartition(partition(draw, props)!, random) };
  if (draw.kind === "deck" && state.kind === "deck") {
    const size = list(props[draw.pool]).length;
    return role === "reset" ? initialDeck(size) : drawBatch(state, size, Number(props[draw.count]), random);
  }
  return state;
}
