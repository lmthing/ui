import { wordsFor } from "../../../catalog";
import {
  drawRole,
  planAct,
  projectAdjustments,
  type ActStep,
  type RandomSource,
  type Values,
} from "../../../catalog";
import { selectedStep, stageConfirmedClear, type ActOptions, type ActReply } from "../index";
import {
  actionFailure,
  confirmationAction,
  confirmationFor,
  handlerFor,
  type ActionContext,
  type ActionResult,
  type ActionState,
} from "../actions";
import { snapshotPlanning, type ControllerContext, type ScreenComponent } from "./context";
import type { MediaRuntime } from "./media";
function introducedPart(ctx: ControllerContext, state: ActionState, entry: ScreenComponent) {
  const cursor = ctx.key(entry.id, "$cursor");
  return (
    (entry.c === "Sheet" && state.sheet !== ctx.status.openSheet) ||
    (entry.c === "SwipeStack" && state.values[cursor] !== ctx.valuesOf()[cursor])
  );
}
function prepareStep(
  state: ActionState,
  action: ActStep,
  ctx: ControllerContext,
  media: MediaRuntime,
  at: number,
  confirmed = false,
): { state: ActionState; context: ActionContext } | { error: Extract<ActReply, { ok: false }> } {
  const active = ctx.liveScreen(state.values, state.sheet, Boolean(state.sheet));
  const id = action.address.split("/")[0]!;
  const entry = active.components.find((item) => item.id === id);
  const fail = (code: string, hint: string) => ({ error: actionFailure(at, code, hint) });
  if (!entry || !ctx.defs[entry.c]) return fail("not_actionable", "No component at this address");
  const def = ctx.defs[entry.c]!;
  if (ctx.disabledParts.has(action.address)) return fail("disabled", "This control is disabled");
  let input: Values;
  try {
    input = ctx.inputOf(entry);
    if (def.meta.items?.set)
      input = projectAdjustments(def.meta, input, (part) => state.values[ctx.key(id, part)]);
  } catch {
    return fail("invalid_value", "This component has invalid props");
  }
  if (entry.c === "Composer" && action.action === "send" && !String(input.value ?? "").trim())
    return fail("disabled", "Write a reply before sending");
  if (entry.c === "Counter" && action.action === "decrement" && Number(input.value) < Number(input.step))
    return fail("disabled", "The counter cannot go below zero");
  const selected = selectedStep(action, entry, input, def);
  const plan = planAct(active, ctx.defs, state.values, [selected], null);
  if (!plan.ok) return { error: { ...plan, at } };
  const mustMount = ctx.options.requireMounted && !confirmed && !introducedPart(ctx, state, entry);
  if (mustMount && !ctx.mounted.has(action.address))
    return fail("not_mounted", "This control is not mounted");
  const values = confirmed
    ? stageConfirmedClear(ctx.screen.id, entry, input, def, selected, plan.values)
    : plan.values;
  if (!values) return fail("invalid_value", "Clear conflicts with component props");
  return {
    state: { ...state, values, changes: [...state.changes, ...plan.changed] },
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
function isDraw({ entry, defs, selected }: ActionContext) {
  const target = selected.address.split("/").slice(1).join("/") || "root";
  const role = drawRole(defs[entry.c]!.meta, target, selected.action);
  return role === "draw" || role === "redraw";
}

function planSteps(
  list: ActStep[],
  ctx: ControllerContext,
  media: MediaRuntime,
  random: RandomSource | null | undefined,
): ActionResult & { performed: ActStep[]; drew?: boolean } {
  let state: ActionState = {
    values: { ...ctx.valuesOf() },
    sheet: ctx.status.openSheet,
    confirmation: ctx.status.confirmation,
    changes: [],
  };
  const effects: (() => void)[] = [];
  const performed: ActStep[] = [];
  let drew = false;
  for (const [at, step] of list.entries()) {
    const action = { ...step, address: ctx.relative(step.address) };
    const run = (before: ActionState, original: ActStep, confirmed = false): ActionResult => {
      const selected = { ...original, address: ctx.relative(original.address) };
      const prepared = prepareStep(before, selected, ctx, media, at, confirmed);
      if ("error" in prepared) return { state: before, effects: [], error: prepared.error };
      const pending = !confirmed && confirmationFor(before, selected, prepared.context);
      if (pending) return pending;
      performed.push(selected);
      if (isDraw(prepared.context)) {
        drew = true;
        if (random !== null) {
          const { active, selected: planned } = prepared.context;
          const plan = planAct(active, ctx.defs, before.values, [planned], random);
          if (!plan.ok) return { state: before, effects: [], error: { ...plan, at } };
          prepared.state.values = plan.values;
          prepared.state.changes = [...before.changes, ...plan.changed];
        }
      }
      const address = confirmed ? original.address.replace(`${ctx.screen.id}/`, "") : selected.address;
      const links = prepared.context.links.map((link) => ({
        ...link,
        address: `${ctx.screen.id}/${address}`,
      }));
      return handlerFor(selected.action)(
        prepared.state,
        { ...selected, address },
        { ...prepared.context, links },
      );
    };
    let result: ActionResult;
    if (state.confirmation)
      result = confirmationAction(state, action, { screen: ctx.screen, at, options: ctx.options }, (s, a) =>
        run(s, a, true),
      );
    else result = run(state, action);
    if (result.error) return { ...result, performed: [] };
    state = result.state;
    Object.assign(state.values, ctx.expiredProgress(state.values));
    effects.push(...result.effects);
  }
  return { state, effects, performed, drew };
}
export function createAct(ctx: ControllerContext, media: MediaRuntime, scheduleClock: () => void) {
  return function act(steps: ActStep | ActStep[], opts: ActOptions = {}): ActReply {
    if (ctx.status.disposed) return actionFailure(0, "not_actionable", "This screen is no longer mounted");
    if (ctx.options.interactive === false)
      return actionFailure(0, "not_interactive", "This screen is a preview");
    const list = Array.isArray(steps) ? steps : [steps];
    if (!list.length) return { ok: true, screen: ctx.screen.id, changed: "", dryRun: Boolean(opts.dryRun) };
    const planning = snapshotPlanning(ctx);
    const preview = planSteps(list, planning, media, null);
    if (preview.error) return preview.error;
    if (opts.dryRun)
      return { ok: true, screen: ctx.screen.id, changed: preview.state.changes.join("\n"), dryRun: true };
    // Prepare media after validation, before consuming randomness or committing values.
    let settleMedia: (commit: boolean) => Values;
    try {
      settleMedia = media.prepare(preview.performed, Boolean(preview.drew));
    } catch (error) {
      return actionFailure(
        0,
        "media_unavailable",
        error instanceof Error ? error.message : wordsFor(ctx.options.lang).mediaUnavailable,
      );
    }
    const result = preview.drew ? planSteps(list, planning, media, ctx.options.random) : preview;
    if (result.error) {
      settleMedia(false);
      return result.error;
    }
    const { state, effects } = result;
    ctx.status.openSheet = state.sheet;
    ctx.status.confirmation = state.confirmation;
    state.values[`${ctx.screen.id}/$sheet`] = state.sheet;
    state.values[`${ctx.screen.id}/$confirmation`] = state.confirmation;
    state.values[`${ctx.screen.id}/$agentMode`] = Boolean(opts.agent);
    ctx.store.setMany({ ...settleMedia(true), ...state.values });
    for (const effect of effects) effect();
    scheduleClock();
    ctx.notifyChange();
    return { ok: true, screen: ctx.screen.id, changed: state.changes.join("\n"), dryRun: false };
  };
}
