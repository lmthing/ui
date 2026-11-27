import {
  Children,
  cloneElement,
  isValidElement,
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
  const [removed, setRemoved] = useState<Exit[]>([]);
  const keys = new Set(current.map(keyOf));
  const missing = environment.agentMode ? [] : exitsOf(previous.current, keys, keepExit ?? (() => true));
  const retained = environment.agentMode
    ? []
    : removed.filter((item) => !keys.has(keyOf(item.node)) && (keepExit?.(item.node) ?? true));
  useLayoutEffect(() => {
    previous.current = current;
    if (missing.length || retained.length !== removed.length) setRemoved([...retained, ...missing]);
  });
  useEffect(() => {
    if (!removed.length) return;
    const first = Math.min(...removed.map(({ expires }) => expires));
    const timer = setTimeout(
      () => setRemoved((items) => items.filter(({ expires }) => expires > Date.now())),
      Math.max(1, first - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [removed]);
  const result: ReactNode[] = [...current];
  for (const item of [...retained, ...missing].reverse()) {
    const index = item.before ? result.findIndex((node) => keyOf(node) === item.before) + 1 : 0;
    const node = isValidElement(item.node)
      ? cloneElement(item.node as ReactElement<{ exiting?: boolean }>, { exiting: true })
      : item.node;
    result.splice(Math.max(0, index), 0, node);
  }
  return result;
}

export function KitPresence({
  children,
  keepExit,
}: {
  children: ReactNode;
  /** A live item moved to another region should not linger in its old one. */
  keepExit?: (node: ReactNode) => boolean;
}) {
  return <>{usePresence(children, keepExit)}</>;
}
