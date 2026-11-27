import { useMemo, type ReactNode } from "react";
import { noopParts } from "../registry";
import { KitContext } from "./context";
import { useKit } from "./useKit";

/** Keep the outgoing row's visuals without retaining its host bindings. */
export function KitVisualOnly({ active, children }: { active: boolean; children: ReactNode }) {
  const kit = useKit();
  const value = useMemo(() => {
    if (!active) return kit;
    const { controller: _controller, onLink: _onLink, nativeHost: _host, ...rest } = kit;
    return { ...rest, parts: noopParts, interactive: false, visualOnly: true } as const;
  }, [active, kit]);
  return <KitContext.Provider value={value}>{children}</KitContext.Provider>;
}
