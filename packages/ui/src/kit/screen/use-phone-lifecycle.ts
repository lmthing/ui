import { useEffect, useMemo, useState } from "react";
import type { ScreenController, createAgentAccess } from "../interact";

type AgentAccess = ReturnType<typeof createAgentAccess>;
export function usePhoneLifecycle(
  controller: ScreenController,
  agent: AgentAccess,
  onReady: ((agent: AgentAccess) => void) | undefined,
) {
  const lifecycle = useMemo(() => ({ mounted: false }), [controller]);
  const [, render] = useState(0);
  useEffect(() => controller.store.subscribe(() => render((version) => version + 1)), [controller]);
  useEffect(() => {
    lifecycle.mounted = true;
    controller.mount();
    return () => {
      if (typeof window !== "undefined" && window.__lmthingUI === agent) delete window.__lmthingUI;
      lifecycle.mounted = false;
      queueMicrotask(() => {
        if (!lifecycle.mounted) controller.dispose();
      });
    };
  }, [agent, controller, lifecycle]);
  useEffect(() => {
    // A layout effect can synchronously mount pinned descendants in a second commit.
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      if (typeof window !== "undefined") window.__lmthingUI = agent;
      onReady?.(agent);
    });
    return () => {
      active = false;
    };
  }, [agent, onReady]);
}
