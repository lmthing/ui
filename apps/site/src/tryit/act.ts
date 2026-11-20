import {
  affordancesOf,
  components,
  liveProps,
  migrateScreen,
  parseControlProps,
  planAct,
  type Affordance,
  type Definition,
  type ScreenLike,
} from "@lmthing/ui/catalog";

const defs = components as unknown as Record<string, Definition>;

/** Every address and action the screen offers: the only answers the model may give. */
export function offered(screen: ScreenLike): Affordance[] {
  return migrateScreen(screen, { variantOnly: true }).components.flatMap(
    ({ id, c, state: _state, ...input }) => {
      const def = defs[c];
      if (!def) return [];
      // List derives disclosure and row actions during parsing; raw wire props do not carry them.
      const props = liveProps(def.meta, parseControlProps(def, input), id, {}, true);
      return affordancesOf(def.meta, props, id);
    },
  );
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
  const result = planAct(screen, defs, {}, [{ address, action }]);
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
