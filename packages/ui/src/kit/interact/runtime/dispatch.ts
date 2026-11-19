import { wordsFor } from "../../../catalog";
import { drawRole, planAct, type ActStep, type RandomSource, type Values } from "../../../catalog";
import { selectedStep, type ActOptions, type ActReply } from "../index";
import {
  actionFailure,
  confirmationAction,
  confirmationFor,
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
  confirmed = false,
): { state: ActionState; context: ActionContext } | { error: Extract<ActReply, { ok: false }> } {
  const active = ctx.liveScreen(state.values, state.sheet, Boolean(state.sheet));
  const id = action.address.split("/")[0]!;
  const entry = active.components.find((item) => item.id === id);
  const fail = (code: string, hint: string) => ({ error: actionFailure(at, code, hint) });
  if (!entry || !ctx.defs[entry.c]) return fail("not_actionable", "No component at this address");
  const meta = ctx.defs[entry.c]!.meta;
  if (entry.state && entry.state !== "filled" && !meta.draw && !meta.emptyActions?.length)
    return fail("not_actionable", "This component is not filled");
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
  const plan = planAct(active, ctx.defs, state.values, [selected], null);
  if (!plan.ok) return { error: { ...plan, at } };
  const introduced =
    (entry.c === "Sheet" && state.sheet !== ctx.status.openSheet) ||
    (entry.c === "SwipeStack" &&
      state.values[ctx.key(id, "$cursor")] !== ctx.store.get(ctx.key(id, "$cursor")));
  if (ctx.options.requireMounted && !confirmed && !introduced && !ctx.mounted.has(action.address))
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
function isDraw({ entry, defs, selected }: ActionContext) {
  const target = selected.address.split("/").slice(1).join("/") || "root";
  const role = drawRole(defs[entry.c]!.meta, target, selected.action);
  return role === "draw" || role === "redraw";
}

function planSteps(
  list: ActStep[],
  ctx: ControllerContext,
  media: MediaRuntime,
  random?: RandomSource | null,
): ActionResult & { performed: ActStep[]; drew?: boolean } {
  let state: ActionState = {
    values: ctx.valuesOf(),
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
    const preview = opts.dryRun || list.length > 1 ? planSteps(list, ctx, media, null) : undefined;
    const result =
      preview && (opts.dryRun || preview.error || !preview.drew)
        ? preview
        : planSteps(list, ctx, media, ctx.options.random);
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
      media.prepare(result.performed);
    } catch (error) {
      return actionFailure(
        0,
        "media_unavailable",
        error instanceof Error ? error.message : wordsFor(ctx.options.lang).mediaUnavailable,
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
