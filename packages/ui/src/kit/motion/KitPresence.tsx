import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { durations } from "../../catalog";
import { useKit } from "../provider";
/** Keep the same motion node/key at its old position until its disabled exit finishes. */
export function KitPresence({
  children,
  keepExit,
}: {
  children: ReactNode;
  /** A live item moved to another region should not linger in its old one. */
  keepExit?: (node: ReactNode) => boolean;
}) {
  const { environment } = useKit();
  const current = Children.toArray(children);
  const previous = useRef<ReactNode[]>(current);
  const [removed, setRemoved] = useState<{ node: ReactNode; before?: string }[]>([]);
  const keyOf = (node: ReactNode) => (isValidElement(node) ? String(node.key) : String(node));
  const keys = new Set(current.map(keyOf));
  const old = previous.current;
  const missing = old.flatMap((node, index) => {
    if (keys.has(keyOf(node))) return [];
    const anchor = old
      .slice(0, index)
      .reverse()
      .find((item) => keys.has(keyOf(item)));
    return [{ node, ...(anchor ? { before: keyOf(anchor) } : {}) }];
  });
  previous.current = current;
  const signature = current.map(keyOf).join("|");
  useEffect(() => {
    if (environment.agentMode) {
      setRemoved([]);
      return;
    }
    if (!missing.length) return;
    setRemoved(missing);
    const timer = setTimeout(() => setRemoved([]), durations.fast);
    return () => clearTimeout(timer);
  }, [signature, environment.agentMode]);
  const result: ReactNode[] = [...current];
  if (!environment.agentMode)
    for (const item of [...removed, ...missing]
      .filter(
        (item, index, all) =>
          all.findIndex((candidate) => keyOf(candidate.node) === keyOf(item.node)) === index &&
          !keys.has(keyOf(item.node)) &&
          (keepExit?.(item.node) ?? true),
      )
      .reverse()) {
      const index = item.before ? result.findIndex((node) => keyOf(node) === item.before) + 1 : 0;
      const node = isValidElement(item.node)
        ? cloneElement(item.node as ReactElement<{ exiting?: boolean }>, { exiting: true })
        : item.node;
      result.splice(Math.max(0, index), 0, node);
    }
  return <>{result}</>;
}
