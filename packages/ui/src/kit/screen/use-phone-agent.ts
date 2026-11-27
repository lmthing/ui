import { useLayoutEffect } from "react";
import { scopeAgentAccess, type PhoneAgent } from "./agent-access";

type OnReady = (agent: PhoneAgent) => (() => void) | void;

export function usePhoneAgent(
  agent: PhoneAgent,
  onReady: OnReady | undefined,
  interactive: boolean,
  readOnly: boolean,
) {
  useLayoutEffect(() => {
    if (!onReady || (!interactive && !readOnly)) return;
    let active = true;
    let cleanup: ReturnType<OnReady>;
    const access = scopeAgentAccess(agent, () => active, readOnly);
    // Pinned descendants can register their controls in a second layout commit.
    queueMicrotask(() => {
      if (!active) return;
      const release = onReady(access);
      if (active) cleanup = release;
      else release?.();
    });
    return () => {
      active = false;
      cleanup?.();
    };
  }, [agent, onReady, interactive, readOnly]);
}
