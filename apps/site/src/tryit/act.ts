import {
  affordancesOf,
  components,
  planAct,
  stampItemIds,
  type Affordance,
  type ScreenLike,
} from "@lmthing/ui/catalog";

type Def = { meta: unknown };

/** Every address and action the screen offers: the only answers the model may give. */
export function offered(screen: ScreenLike): Affordance[] {
  const defs = components as unknown as Record<string, Def>;
  return screen.components.flatMap(({ id, c, state: _state, ...props }) => {
    const def = defs[c];
    return def ? affordancesOf(def.meta as never, stampItemIds(def.meta as never, props), id, {}) : [];
  });
}

/** `{address, action}` limited to real pairs, so a model cannot name a part or action the screen lacks. */
export function actSchema(affordances: Affordance[]) {
  const pairs = affordances.map((a) => ({
    type: "object",
    properties: {
      address: { type: "string", enum: [a.address] },
      action: { type: "string", enum: [a.action] },
    },
    required: ["address", "action"],
    additionalProperties: false,
  }));
  return { anyOf: pairs };
}

export type ActOutcome = { ok: boolean; address: string; action: string; message: string };

/** Resolves a model's answer with the catalog's act code, the same code a touch runs. */
export function resolveAnswer(screen: ScreenLike, text: string): ActOutcome {
  let answer: { address: string; action: string };
  try {
    answer = JSON.parse(text) as { address: string; action: string };
  } catch {
    return { ok: false, address: "", action: "", message: "the answer was not valid JSON" };
  }
  const { address, action } = answer;
  const result = planAct(screen, components as never, {}, [{ address, action }]);
  if (!result.ok)
    return {
      ok: false,
      address,
      action,
      message: `not actionable: ${"hint" in result ? result.hint : result.code}`,
    };
  const link = result.links[0];
  const done = result.changed[0] ?? `${address} ${action}`;
  return { ok: true, address, action, message: link ? `${done}, opens "${link.goto}"` : done };
}
