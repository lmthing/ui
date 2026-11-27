import { scopeAgentAccess, type PhoneAgent } from "./agent-access";

declare global {
  interface Window {
    __lmthingUI?: PhoneAgent;
  }
}

/** Use as a PhoneScreen onReady callback, or return its cleanup from your own callback. */
export function publishBrowserAgent(agent: PhoneAgent): () => void {
  if (typeof window === "undefined") return () => {};
  const browser = window;
  let active = true;
  const exposed = scopeAgentAccess(agent, () => active && browser.__lmthingUI === exposed);
  browser.__lmthingUI = exposed;
  return () => {
    active = false;
    if (browser.__lmthingUI === exposed) delete browser.__lmthingUI;
  };
}
