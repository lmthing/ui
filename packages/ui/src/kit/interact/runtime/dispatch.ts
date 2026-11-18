import { planAct, type ActStep, type Values } from "../../../catalog";
import { selectedStep, type ActOptions, type ActReply } from "../index";
import {
  actionFailure,
  confirmationAction,
  handlerFor,
  type ActionContext,
  type ActionResult,
  type ActionState,
} from "../actions";
import type { ControllerContext } from "./context";
import type { MediaRuntime } from "./media";
function prepareStep(
  state: ActionState,
  action: ActStep,
  ctx: ControllerContext,
  media: MediaRuntime,
  at: number,
): { state: ActionState; context: ActionContext } | { error: Extract<ActReply, { ok: false }> } {
  const active = ctx.liveScreen(state.values, state.sheet, Boolean(state.sheet));
  const id = action.address.split("/")[0]!;
  const entry = active.components.find((item) => item.id === id);
  const fail = (code: string, hint: string) => ({ error: actionFailure(at, code, hint) });
  if (!entry || !ctx.defs[entry.c]) return fail("not_actionable", "No component at this address");
  if (entry.state && entry.state !== "filled") return fail("not_actionable", "This component is not filled");
  let input: Values;
  try {
    input = ctx.inputOf(entry);
  } catch {
    return fail("invalid_value", "This component has invalid props");
  }
  if (entry.c === "Composer" && action.action === "send" && !String(input.value ?? "").trim())
    return fail("disabled", "Write a reply before sending");
  if (entry.c === "Counter" && action.action === "decrement" && Number(input.value) < Number(input.step))
    return fail("disabled", "The counter cannot go below zero");
  const selected = selectedStep(action, entry, input, ctx.defs[entry.c]!);
  const plan = planAct(active, ctx.defs, state.values, [selected]);
  if (!plan.ok) return { error: { ...plan, at } };
  const introduced =
    (entry.c === "Sheet" && state.sheet !== ctx.status.openSheet) ||
    (entry.c === "SwipeStack" &&
      state.values[ctx.key(id, "$cursor")] !== ctx.store.get(ctx.key(id, "$cursor")));
  if (ctx.options.requireMounted && !introduced && !ctx.mounted.has(action.address))
    return fail("not_mounted", "This control is not mounted");
  return {
    state: { ...state, values: plan.values, changes: [...state.changes, ...plan.changed] },
    context: {
      screen: ctx.screen,
      active,
      entry,
      input,
      defs: ctx.defs,
      selected,
      links: plan.links,
      at,
      now: ctx.now,
      key: ctx.key,
      options: ctx.options,
      playMedia: media.playMedia,
      seekMedia: media.seekMedia,
      requestPhoto: media.requestPhoto,
    },
  };
}
function planSteps(list: ActStep[], ctx: ControllerContext, media: MediaRuntime): ActionResult {
  let state: ActionState = {
    values: ctx.valuesOf(),
    sheet: ctx.status.openSheet,
    confirmation: ctx.status.confirmation,
    changes: [],
  };
  const effects: (() => void)[] = [];
  for (const [at, step] of list.entries()) {
    const action = { ...step, address: ctx.relative(step.address) };
    let result: ActionResult;
    if (state.confirmation)
      result = confirmationAction(state, action, { screen: ctx.screen, at, options: ctx.options });
    else {
      const prepared = prepareStep(state, action, ctx, media, at);
      if ("error" in prepared) return { state, effects: [], error: prepared.error };
      result = handlerFor(action.action)(prepared.state, action, prepared.context);
    }
    if (result.error) return result;
    state = result.state;
    effects.push(...result.effects);
  }
  return { state, effects };
}
export function createAct(ctx: ControllerContext, media: MediaRuntime, scheduleClock: () => void) {
  return function act(steps: ActStep | ActStep[], opts: ActOptions = {}): ActReply {
    if (ctx.status.disposed) return actionFailure(0, "not_actionable", "This screen is no longer mounted");
    if (ctx.options.interactive === false)
      return actionFailure(0, "not_interactive", "This screen is a preview");
    const list = Array.isArray(steps) ? steps : [steps];
    if (!list.length) return { ok: true, screen: ctx.screen.id, changed: "", dryRun: Boolean(opts.dryRun) };
    const result = planSteps(list, ctx, media);
    if (result.error) return result.error;
    const { state, effects } = result;
    const reply = {
      ok: true as const,
      screen: ctx.screen.id,
      changed: state.changes.join("\n"),
      dryRun: Boolean(opts.dryRun),
    };
    if (opts.dryRun) return reply;
    // Prepare media only after validation, before committing any changes.
    try {
      media.prepare(list);
    } catch (error) {
      return actionFailure(
        0,
        "media_unavailable",
        error instanceof Error ? error.message : "Recording unavailable",
      );
    }
    ctx.status.openSheet = state.sheet;
    ctx.status.confirmation = state.confirmation;
    state.values[`${ctx.screen.id}/$sheet`] = state.sheet;
    state.values[`${ctx.screen.id}/$confirmation`] = state.confirmation;
    state.values[`${ctx.screen.id}/$agentMode`] = Boolean(opts.agent);
    ctx.store.setMany(state.values);
    for (const effect of effects) effect();
    scheduleClock();
    ctx.notifyChange();
    return reply;
  };
}
