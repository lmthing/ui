import {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ContextType,
  type ReactNode,
} from "react";
import { isWeb, VisuallyHidden } from "tamagui";
import { formatAddress } from "../../../catalog";
import { PartRefScope, usePartContext } from "../../part";
import { useKit } from "../../provider";

export type RowOutcomeProps = {
  /** Set only once the result is accepted; leave unset for unopened, pending or rejected actions. */
  message?: string | undefined;
  status?: string;
  focusFrom: readonly string[];
  /** A host-acknowledged local action can supply its own origin evidence (including native). */
  acknowledged?: boolean;
};

function useOutcomeFocus(status: string, focusFrom: readonly string[]) {
  const context = usePartContext();
  const parent = useContext(PartRefScope);
  const address = formatAddress({ ...context, part: status });
  const sources = focusFrom.map((part) => formatAddress({ ...context, part })).join(" ");
  const target = useRef<{ current: unknown } | null>(null);
  const belongs = useRef(false);
  useEffect(() => {
    if (!isWeb) return;
    const from = new Set(sources.split(" "));
    const observe = () => {
      const node = document.activeElement;
      if (!node || node.closest('[role="dialog"]')) return;
      belongs.current = from.has(node.closest("[data-testid]")?.getAttribute("data-testid") ?? "");
    };
    observe();
    document.addEventListener("focusin", observe);
    return () => document.removeEventListener("focusin", observe);
  }, [sources]);
  const register = useCallback<NonNullable<ContextType<typeof PartRefScope>>>(
    (id, ref) => {
      if (id === address) target.current = ref;
      const unregister = parent?.(id, ref);
      return () => {
        if (target.current === ref) target.current = null;
        unregister?.();
      };
    },
    [address, parent],
  );
  return { target, belongs, register };
}

export function RowOutcome({
  children,
  message,
  status = "status",
  focusFrom,
  acknowledged = false,
}: RowOutcomeProps & { children: ReactNode }) {
  const { environment, nativeHost } = useKit();
  const { target, belongs, register } = useOutcomeFocus(status, focusFrom);
  const previous = useRef(message);
  const [announcement, setAnnouncement] = useState("");
  useEffect(() => {
    const changed = previous.current !== message;
    previous.current = message;
    if (!changed) return;
    const node = target.current?.current;
    if (!message || environment.agentMode) {
      setAnnouncement("");
    } else if (
      isWeb &&
      node instanceof HTMLElement &&
      (belongs.current || acknowledged) &&
      node.ownerDocument.activeElement === node.ownerDocument.body
    ) {
      node.tabIndex = -1;
      node.focus({ preventScroll: true });
      setAnnouncement("");
    } else if (!isWeb && node && acknowledged && nativeHost?.focusAccessibility) {
      nativeHost.focusAccessibility(node);
      setAnnouncement("");
    } else {
      setAnnouncement(message);
    }
  }, [message, environment.agentMode, acknowledged, belongs, nativeHost, target]);
  return (
    <PartRefScope.Provider value={register}>
      {children}
      <VisuallyHidden aria-live="polite" aria-atomic>
        {announcement}
      </VisuallyHidden>
    </PartRefScope.Provider>
  );
}
