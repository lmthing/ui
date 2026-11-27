import type { createAgentAccess } from "../interact";

export type PhoneAgent = ReturnType<typeof createAgentAccess>;

export function scopeAgentAccess(agent: PhoneAgent, active: () => boolean, readOnly = false): PhoneAgent {
  return {
    read: () => (active() ? agent.read() : ""),
    act(steps, options) {
      if (!active()) return { ok: false, code: "not_mounted", at: 0 };
      if (readOnly) return { ok: false, code: "not_interactive", at: 0 };
      return agent.act(steps, options);
    },
    log: () => (active() && !readOnly ? agent.log() : []),
    reset() {
      if (active() && !readOnly) agent.reset();
    },
  };
}
