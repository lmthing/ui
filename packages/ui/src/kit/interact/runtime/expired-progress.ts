import {
  buzzKey,
  drawKey,
  liveProps,
  sessionKey,
  stampItemIds,
  staleBuzz,
  staleDraw,
  staleSession,
  type Definition,
  type ScreenLike,
  type Values,
} from "../../../catalog";
import { projectScreen, valueKey } from "../index";

export function expiredProgress(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  values: Values,
  now: number,
) {
  const expired: Values = {};
  const candidates = screen.components.filter(({ id }) =>
    [drawKey, sessionKey, buzzKey].some((part) => values[valueKey(screen.id, id, part)] !== undefined),
  );
  if (!candidates.length) return expired;
  const projected = projectScreen({ ...screen, components: candidates }, defs, values, now, undefined, true);
  const local = Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key.replace(`${screen.id}/`, ""), value]),
  );
  for (const { id, c, state: _state, ...input } of projected.components) {
    const def = defs[c];
    const draw = valueKey(screen.id, id, drawKey);
    const session = valueKey(screen.id, id, sessionKey);
    const buzz = valueKey(screen.id, id, buzzKey);
    const props = def?.props.safeParse(input);
    if (!def || !props?.success) continue;
    const live = liveProps(def.meta, stampItemIds(def.meta, props.data as Values), id, local, true);
    if (staleDraw(def.meta, live, values[draw])) expired[draw] = undefined;
    if (staleSession(def.meta, live, values[session])) expired[session] = undefined;
    if (staleBuzz(def.meta, live, values[buzz])) expired[buzz] = undefined;
  }
  return expired;
}
