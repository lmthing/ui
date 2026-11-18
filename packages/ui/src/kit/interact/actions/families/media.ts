import type { ActStep } from "../../../../catalog";
import { rejected, type ActionContext, type ActionResult, type ActionState } from "../index";
export function mediaAction(state: ActionState, action: ActStep, ctx: ActionContext): ActionResult {
  const { input, entry, key } = ctx;
  const id = entry.id;
  const part = action.address.split("/")[1];
  if (!ctx.options.media)
    return rejected(state, ctx.at, "media_unavailable", "The host has no local media adapter");
  const values = { ...state.values };
  const effects: (() => void)[] = [];
  if (action.action === "seek" || part === "back" || part === "forward") {
    const here = Number(values[key(id, "scrubber")] ?? input.at ?? 0);
    const target =
      action.action === "seek"
        ? Number(action.value)
        : Math.max(0, Math.min(Number(input.seconds), here + (part === "back" ? -15 : 15)));
    if (target > Number(input.seconds))
      return rejected(state, ctx.at, "invalid_value", "Cannot seek past the end of this recording");
    values[key(id, "scrubber")] = target;
    effects.push(() => ctx.seekMedia(id, target));
  } else if (action.action === "play" || action.action === "pause") {
    const playing = action.action === "play";
    values[key(id, "play")] = playing;
    if (playing) values[key(id, "error")] = undefined;
    effects.push(() => ctx.playMedia(id, playing));
  }
  return { state: { ...state, values }, effects };
}
