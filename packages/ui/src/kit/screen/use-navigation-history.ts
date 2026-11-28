import { useRef } from "react";
import { popReturnPoint, rememberRoute, returnIndex, type ReturnPoint } from "./return-point";
import { matchesNavigation, type NavigationIntent, type ScreenReturnPoint } from "./screen-navigation";

type ReplacesRoute = (from: string, to: string) => boolean;
type History = {
  id: string;
  agent: boolean;
  scriptedFocus: boolean;
  returned: ScreenReturnPoint | undefined;
  record: NavigationIntent["record"];
  origins: ReturnPoint[];
};

export function useNavigationHistory(
  id: string,
  pending: NavigationIntent | undefined,
  replacesRoute: ReplacesRoute | undefined,
) {
  const history = useRef<History>({
    id,
    agent: false,
    scriptedFocus: false,
    returned: undefined,
    record: undefined,
    origins: [],
  });
  const current = history.current;
  const navigating = matchesNavigation(pending, id);
  const back = navigating && pending.kind === "back";
  const point = back ? current.origins[returnIndex(current.origins, pending.from, id)] : undefined;
  const returnTo = point
    ? { address: point.address, scrollTop: point.top }
    : current.id === id
      ? current.returned
      : undefined;
  return {
    changed: () => current.id !== id,
    agentArrival: navigating ? pending.agent : current.id === id && current.agent,
    scriptedFocus: current.id === id && current.scriptedFocus,
    returnTo,
    record: current.id === id ? current.record : undefined,
    commit: (move: NavigationIntent | undefined, skip = move?.agent ?? false, scripted = false) =>
      commitArrival(current, id, move, { skip, scripted, returnTo, replacesRoute }),
  };
}

function commitArrival(
  history: History,
  id: string,
  move: NavigationIntent | undefined,
  options: {
    skip: boolean;
    scripted: boolean;
    returnTo: ScreenReturnPoint | undefined;
    replacesRoute: ReplacesRoute | undefined;
  },
) {
  const { skip, scripted, returnTo, replacesRoute } = options;
  history.record = skip ? undefined : move?.record;
  if (history.id === id && move?.kind === "record") return;
  history.id = id;
  history.agent = matchesNavigation(move, id) && move.agent;
  history.scriptedFocus = scripted && !skip && move?.kind === "back";
  history.returned = move?.restore ?? returnTo;
  if (!matchesNavigation(move, id)) history.origins.length = 0;
  else if (move.kind === "push") {
    const { from, address, scrollTop: top } = move;
    rememberRoute(history.origins, { from, to: id, address, top }, replacesRoute?.(from, id) ?? false);
  } else if (move.kind === "back") popReturnPoint(history.origins, move.from, id);
  else if (move.kind === "tab") history.origins.length = 0;
}
