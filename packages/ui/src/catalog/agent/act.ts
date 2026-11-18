import { liveProps } from "./live-props";
import type { Definition } from "../probes";
import { stampItemIds } from "../lines";
import { affordancesOf, type Affordance } from "./affordances";
import type { ScreenLike } from "./read";
import { validateActionValue } from "./validate-value";

export type ActStep = { address: string; action: string; value?: unknown };
export type Values = Record<string, unknown>;
export type ActResult =
  | { ok: true; values: Values; changed: string[]; links: { goto: string; address: string }[] }
  | { ok: false; code: "not_actionable" | "invalid_value"; at: number; hint?: string };

const relative = (screen: string, address: string) =>
  address.replace(new RegExp(`^${screen}/`), "").replace(/\/root$/, "");

function affordancesOfScreen(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  values: Values,
): Affordance[] {
  const local = Object.fromEntries(
    Object.entries(values).map(([address, value]) => [address.replace(`${screen.id}/`, ""), value]),
  );
  return screen.components.flatMap(({ id, c, state: _state, ...input }) => {
    const def = defs[c];
    if (!def) return [];
    const props = liveProps(def.meta, stampItemIds(def.meta, def.props.parse(input) as Values), id, local);
    return affordancesOf(def.meta, props, id);
  });
}

function initialOn(found: Affordance) {
  return found.detail === ":on" || found.detail === ":done";
}

/**
 * Plans a list of steps against a screen without changing anything: every step must name an offered
 * action with a valid value. All or nothing: the first bad step returns its index and no values, so
 * a caller commits `values` only when `ok` (atomic batches; a dry run is simply not committing).
 */
export function planAct(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  values: Values,
  steps: ActStep[],
): ActResult {
  const offered = affordancesOfScreen(screen, defs, values);
  const next: Values = { ...values };
  const changed: string[] = [];
  const links: { goto: string; address: string }[] = [];
  for (const [at, step] of steps.entries()) {
    const address = relative(screen.id, step.address);
    const found = offered.find((a) => a.address === address && a.action === step.action);
    if (!found) {
      const here = offered.filter((a) => a.address === address).map((a) => a.action);
      const hint = here.length ? `offers ${here.join(", ")}` : "no action at this address";
      return { ok: false, code: "not_actionable", at, hint };
    }
    const error = validateActionValue(step.action, step.value);
    if (error) return { ok: false, at, ...error };
    const key = `${screen.id}/${address}`;
    if (step.action === "toggle" || step.action === "check") {
      const now = (next[key] as boolean | undefined) ?? initialOn(found);
      next[key] = (step.value as boolean | undefined) ?? !now;
    } else if (step.action === "increment" || step.action === "decrement") {
      next[key] = Number(next[key] ?? 0) + (step.action === "increment" ? 1 : -1);
    } else if (step.action === "press" || step.action === "select") {
      if (found.detail.startsWith("→")) links.push({ goto: found.detail.slice(1), address: key });
      if (step.action === "select") next[key] = step.value;
    } else {
      next[key] = step.value;
    }
    changed.push(`${address} ${step.action}${key in next ? ` = ${JSON.stringify(next[key])}` : ""}`);
  }
  return { ok: true, values: next, changed, links };
}
