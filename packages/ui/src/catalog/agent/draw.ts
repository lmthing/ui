import type { Meta } from "../meta";
import type { StateName } from "../types";
import { stampItemIds } from "../lines";
import type { Values } from "./act";
export const drawKey = "$draw";
export type DrawState =
  | { kind: "faces"; faces: readonly number[]; held: readonly boolean[] }
  | { kind: "pick"; index?: number; used: readonly number[]; remaining: number }
  | { kind: "partition"; teams: readonly number[] };

type Draw = NonNullable<Meta["draw"]>;
type DrawRole = "draw" | "redraw" | "reset" | "hold";
type Get = (part: string) => unknown;

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
  const [item, part, extra] = target.split("/");
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
  if (draw.kind === "partition" && target === draw.redraw) return "redraw";
}

/** Shared state for the reader and views, including the initial pool size before any press. */
export function drawState(meta: Meta, props: Values, get: Get): DrawState | undefined {
  const draw = meta.draw;
  if (!draw) return;
  const stored = get(drawKey) as DrawState | undefined;
  if (stored?.kind === draw.kind) return stored;
  if (draw.kind === "pick") return { kind: "pick", used: [], remaining: list(props[draw.pool]).length };
  if (draw.kind === "faces") return { kind: "faces", faces: [], held: [] };
  return { kind: "partition", teams: [] };
}

export function drawStatus(meta: Meta, props: Values, state: StateName, get: Get): StateName {
  const draw = meta.draw;
  if (!draw || !["filled", "empty", "success"].includes(state)) return state;
  if (draw.kind === "partition" && !partition(draw, props)) return "error";
  const current = drawState(meta, props, get);
  if (state === "empty" && current && hasResult(current)) return "filled";
  return state;
}
function hasResult(state: DrawState): boolean {
  if (state.kind === "faces") return state.faces.length > 0;
  if (state.kind === "partition") return state.teams.length > 0;
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
  return state;
}

/** Each call supplies an unsigned, uniformly distributed 32-bit integer. */
export type RandomSource = () => number;
const range = 2 ** 32;
export const deviceRandom: RandomSource = () => globalThis.crypto.getRandomValues(new Uint32Array(1))[0]!;

export function randomIndex(size: number, random: RandomSource): number {
  if (!Number.isInteger(size) || size < 1 || size > range) throw new RangeError("Invalid draw size");
  if (size === 1) return 0;
  const limit = range - (range % size);
  for (;;) {
    const sample = random();
    if (!Number.isInteger(sample) || sample < 0 || sample >= range)
      throw new RangeError("Invalid random word");
    if (sample < limit) return sample % size;
  }
}

type Partition = {
  locked: readonly (number | undefined)[];
  sizes: number[];
  eligible: number[];
  extra: number;
};

export function partitionPlan(locks: readonly unknown[], teams: number): Partition | undefined {
  if (!Number.isInteger(teams) || teams < 1 || teams > locks.length) return;
  const base = Math.floor(locks.length / teams);
  const max = Math.ceil(locks.length / teams);
  const sizes = Array<number>(teams).fill(0);
  const locked: (number | undefined)[] = [];
  for (const lock of locks) {
    if (lock === undefined) locked.push(undefined);
    else {
      if (typeof lock !== "number" || !Number.isInteger(lock) || lock < 0 || lock >= teams) return;
      const count = sizes[lock]! + 1;
      if (count > max) return;
      sizes[lock] = count;
      locked.push(lock);
    }
  }
  const eligible = sizes.flatMap((size, team) => (size <= base ? [team] : []));
  const extra = (locks.length % teams) - (teams - eligible.length);
  if (extra < 0) return;
  return { locked, sizes: sizes.map((size) => Math.max(size, base)), eligible, extra };
}

export function drawPartition(plan: Partition, random: RandomSource): number[] {
  const { locked, eligible, extra } = plan;
  const capacities = [...plan.sizes];
  const candidates = [...eligible];
  // Pick the extra-capacity teams uniformly from those not forced by locks.
  for (let i = 0; i < extra; i++) {
    const team = candidates.splice(randomIndex(candidates.length, random), 1)[0]!;
    capacities[team] = capacities[team]! + 1;
  }
  for (const team of locked) if (team !== undefined) capacities[team] = capacities[team]! - 1;
  const seats = capacities.flatMap((size, team) => Array<number>(size).fill(team));
  // A uniformly shuffled roster in the open slots is equivalent to drawing slots without replacement.
  return locked.map((team) => {
    if (team !== undefined) return team;
    const index = randomIndex(seats.length, random);
    const picked = seats[index]!;
    const last = seats.pop()!;
    if (index < seats.length) seats[index] = last;
    return picked;
  });
}
