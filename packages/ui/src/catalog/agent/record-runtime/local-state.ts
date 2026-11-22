import type { z } from "zod";
import type { LocalStateEvent, LocalStateRuntime, Meta } from "../../meta";
import type { Definition } from "../../probes";
import type { ActionName } from "../../types";
import type { ActStep, Affordance, ScreenLike, Values } from "../index";
import { parseControlProps } from "../live-props";

type Projection = Readonly<Values>;
type LocalStateOptions<T> = Pick<LocalStateRuntime, "events" | "itemEvents"> & {
  schema: z.ZodType<T>;
  initial: (seed: Projection) => NoInfer<T>;
  reduce: (state: Readonly<NoInfer<T>>, event: LocalStateEvent) => { state: NoInfer<T> } | { error: string };
  /** Public presentation and gating fields only; never return hidden state. */
  project: (state: Readonly<NoInfer<T>>) => Projection;
};

const invalid = { error: "Invalid local state" };
const stateKey = (meta: Meta) => `$localState/${meta.id}`;

/** Keep private state out of live props and validate the entire next state before staging it. */
export function defineLocalState<T>({
  schema,
  initial,
  reduce,
  project,
  ...events
}: LocalStateOptions<T>): LocalStateRuntime {
  return {
    ...events,
    frame(seed, stored) {
      const start = schema.safeParse(initial(seed));
      if (!start.success) return;
      const identity = JSON.stringify(start.data);
      const previous = stored as { seed?: string; state?: unknown } | undefined;
      const parsed = previous?.seed === identity && schema.safeParse(previous.state);
      const state = parsed && parsed.success ? parsed.data : start.data;
      return {
        props: project(state),
        advance(event) {
          const result = reduce(state, event);
          if ("error" in result) return result;
          const next = schema.safeParse(result.state);
          if (!next.success) return invalid;
          // Reject an invalid projection before publishing the new state.
          project(next.data);
          return { stored: { seed: identity, state: next.data } };
        },
      };
    },
  };
}

export function projectLocalState(meta: Meta, props: Values, seed: Values, get: (part: string) => unknown) {
  const frame = meta.localState?.frame(seed, get(stateKey(meta)));
  return frame ? { ...props, ...frame.props } : props;
}

export function localEventOffer(meta: Meta, part: string, action: string, item?: string) {
  const events = item === undefined ? meta.localState?.events : meta.localState?.itemEvents;
  return events?.some((event) => event === `${part}.${action}`)
    ? { part, action: action as ActionName, ...(item === undefined ? {} : { item }) }
    : undefined;
}

export function stageLocalEvent(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  values: Values,
  step: ActStep,
  event: NonNullable<Affordance["localEvent"]>,
) {
  const id = step.address.split("/")[0];
  const { id: _id, c, state: _state, ...raw } = screen.components.find((entry) => entry.id === id)!;
  const def = defs[c]!;
  const get = (part: string) => values[`${screen.id}/${id}/${part}`];
  const key = stateKey(def.meta);
  try {
    const seed = parseControlProps(def, raw, get);
    const result = def.meta.localState?.frame(seed, get(key))?.advance({ ...event, value: step.value });
    if (!result) return invalid;
    if ("error" in result) return result;
    values[`${screen.id}/${id}/${key}`] = result.stored;
  } catch {
    return invalid;
  }
}
