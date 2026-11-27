import { expect, it, vi } from "vitest";
import { scopeAgentAccess, type PhoneAgent } from "./agent-access";

it("forwards access only while active and blocks every mutation in read-only mode", () => {
  const reply = { ok: true, screen: "home", changed: "", dryRun: false } as const;
  const agent = {
    read: vi.fn(() => "screen home"),
    act: vi.fn(() => reply),
    log: vi.fn(() => [{ address: "button", action: "press", at: 0 }]),
    reset: vi.fn(),
  } satisfies PhoneAgent;
  let active = true;
  const writable = scopeAgentAccess(agent, () => active);
  const reader = scopeAgentAccess(agent, () => active, true);
  const step = { address: "button", action: "press" };

  expect(writable.act(step)).toBe(reply);
  expect(writable.log()).toEqual(agent.log());
  expect(reader.read()).toBe("screen home");
  expect(reader.log()).toEqual([]);
  expect(reader.act(step)).toMatchObject({ ok: false, code: "not_interactive" });
  reader.reset();
  writable.reset();
  active = false;
  expect(writable.act(step)).toMatchObject({ ok: false, code: "not_mounted" });
  expect(writable.read()).toBe("");
  expect(writable.log()).toEqual([]);
  writable.reset();
  expect(agent.act).toHaveBeenCalledExactlyOnceWith(step, undefined);
  expect(agent.reset).toHaveBeenCalledTimes(1);
});
