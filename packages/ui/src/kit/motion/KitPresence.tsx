import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { durations } from "../../catalog";
import { useKit } from "../provider";

type Exit = { node: ReactNode; before?: string; expires: number };
const keyOf = (node: ReactNode) => (isValidElement(node) ? String(node.key) : String(node));
export const ListProjectionKey = createContext<string | undefined>(undefined);

function exitsOf(old: ReactNode[], keys: Set<string>, keepExit: (node: ReactNode) => boolean) {
  const expires = Date.now() + durations.fast;
  return old.flatMap((node, index) => {
    if (keys.has(keyOf(node)) || !keepExit(node)) return [];
    const anchor = old
      .slice(0, index)
      .reverse()
      .find((item) => keys.has(keyOf(item)));
    return [{ node, expires, ...(anchor ? { before: keyOf(anchor) } : {}) }];
  });
}

/** Keep the same motion node/key at its old position until its disabled exit finishes. */
export function usePresence(children: ReactNode, keepExit?: (node: ReactNode) => boolean) {
  const { environment } = useKit();
  const current = Children.toArray(children);
  const previous = useRef<ReactNode[]>(current);
  const removed = useRef<Exit[]>([]);
  const [, refresh] = useState(0);
  const keys = new Set(current.map(keyOf));
  const cut = environment.agentMode || environment.reduceMotion;
  const missing = cut ? [] : exitsOf(previous.current, keys, keepExit ?? (() => true));
  const now = Date.now();
  const retained = cut
    ? []
    : removed.current.filter(
        (item) => item.expires > now && !keys.has(keyOf(item.node)) && (keepExit?.(item.node) ?? true),
      );
  const exits = [...retained, ...missing];
  const first = Math.min(...exits.map(({ expires }) => expires));
  useLayoutEffect(() => {
    previous.current = current;
    removed.current = exits;
  });
  useEffect(() => {
    if (!Number.isFinite(first)) return;
    const timer = setTimeout(() => refresh((tick) => tick + 1), Math.max(1, first - Date.now()));
    return () => clearTimeout(timer);
  }, [first]);
  const result: ReactNode[] = [...current];
  for (const item of [...exits].reverse()) {
    const index = item.before ? result.findIndex((node) => keyOf(node) === item.before) + 1 : 0;
    const node = isValidElement(item.node)
      ? cloneElement(item.node as ReactElement<{ exiting?: boolean }>, { exiting: true })
      : item.node;
    result.splice(Math.max(0, index), 0, node);
  }
  return result;
}

export function KitPresence({ children }: { children: ReactNode }) {
  const projection = useContext(ListProjectionKey);
  const previous = useRef(projection);
  // A data-view filter hides rows; it does not delete them.
  const present = usePresence(children, () => projection === previous.current);
  useLayoutEffect(() => {
    previous.current = projection;
  }, [projection]);
  return <>{present}</>;
}
