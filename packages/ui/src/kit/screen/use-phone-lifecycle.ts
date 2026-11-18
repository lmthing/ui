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
    if (typeof window !== "undefined") window.__lmthingUI = agent;
    return () => {
      if (typeof window !== "undefined" && window.__lmthingUI === agent) delete window.__lmthingUI;
      lifecycle.mounted = false;
      queueMicrotask(() => {
        if (!lifecycle.mounted) controller.dispose();
      });
    };
  }, [agent, controller, lifecycle]);
  useEffect(() => {
    onReady?.(agent);
  }, [agent, onReady]);
}
