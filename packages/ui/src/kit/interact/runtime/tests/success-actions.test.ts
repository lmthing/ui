import { expect, it } from "vitest";
import { z } from "zod";
import { planAct, type Definition } from "../../../../catalog";
import { createAgentAccess, createInteractionStore } from "../../index";

it("allows only declared success actions and keeps confirmation on the standalone agent path", () => {
  const def: Definition = {
    meta: {
      id: "SuccessFixture",
      group: "action",
      purpose: "Exercise success actions.",
      pick: "A fixture for success actions.",
      region: "body",
      weight: 1,
      tier: "phone",
      realPath: "Allow a confirmed reset.",
      confirmParts: ["reset"],
      successActions: ["reset.press"],
      actions: { parts: { reset: ["press"], other: ["press"] } },
    },
    props: z.strictObject({}),
    fallback: () => ({}),
    examples: [],
    probes: [],
  };
  const screen = { id: "s", components: [{ id: "game", c: def.meta.id, state: "success" as const }] };
  const defs = { [def.meta.id]: def };
  const agent = createAgentAccess({ current: () => screen, defs, store: createInteractionStore() });
  const step = (part: string) => ({ address: `game/${part}`, action: "press" });
  expect(agent.read()).toBe("screen s\ngame SuccessFixture (success) [game/reset press]");
  expect(agent.act(step("other")).ok).toBe(false);
  expect(agent.act(step("reset")).ok).toBe(true);
  expect(agent.read()).toContain("[confirm/confirm press]");
  expect(agent.act({ address: "confirm/confirm", action: "press" }).ok).toBe(true);
  expect(agent.read()).not.toContain("[confirm/confirm press]");
  const { successActions: _successActions, ...meta } = def.meta;
  const legacy = { [def.meta.id]: { ...def, meta } };
  expect(planAct(screen, legacy, {}, [step("reset")]).ok).toBe(false);
});
