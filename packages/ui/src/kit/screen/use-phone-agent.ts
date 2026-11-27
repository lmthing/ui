import { useLayoutEffect, useRef } from "react";
import { scopeAgentAccess, type PhoneAgent } from "./agent-access";

type OnReady = (agent: PhoneAgent) => (() => void) | void;

export function usePhoneAgent(
  agent: PhoneAgent,
  onReady: OnReady | undefined,
  interactive: boolean,
  readOnly: boolean,
) {
  const current = useRef(agent);
  // A screen update changes the controller, not which host asked to publish.
  useLayoutEffect(() => {
    current.current = agent;
  }, [agent]);
  useLayoutEffect(() => {
    if (!onReady || (!interactive && !readOnly)) return;
    let active = true;
    let cleanup: ReturnType<OnReady>;
    const access = scopeAgentAccess(
      () => current.current,
      () => active,
      readOnly,
    );
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
  }, [onReady, interactive, readOnly]);
}
