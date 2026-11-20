import { expect, it, vi } from "vitest";
import { z } from "zod";
import { readScreen, text, type Definition } from "../../../../catalog";
import { createAgentAccess, createInteractionStore, createScreenController } from "../../index";

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
it("allows only declared success actions and keeps confirmation on the standalone agent path", () => {
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
  const controller = createScreenController({ screen, defs: legacy });
  expect(controller.act(step("reset")).ok).toBe(false);
  expect(controller.read()).not.toContain("[game/reset press]");
});

it("keeps host navigation for an unrelated button in a standalone success-action batch", () => {
  const nav: Definition = {
    ...def,
    meta: {
      ...def.meta,
      id: "NavFixture",
      successActions: [],
      actions: { parts: { go: ["press"] } },
    },
    props: z.strictObject({ goto: z.string() }),
  };
  const screen = {
    id: "s",
    components: [
      { id: "game", c: def.meta.id, state: "success" as const },
      { id: "s", c: nav.meta.id, goto: "sheet" },
    ],
  };
  const onLink = vi.fn();
  const defs = { [def.meta.id]: def, [nav.meta.id]: nav };
  const agent = createAgentAccess({ current: () => screen, defs, store: createInteractionStore(), onLink });
  const navStep = { address: "s/s/go", action: "press" };
  const reset = { address: "game/reset", action: "press" };
  expect(agent.act([navStep, reset, navStep]).ok).toBe(false);
  expect(onLink).not.toHaveBeenCalled();
  expect(agent.act([navStep, reset])).toMatchObject({ ok: true });
  expect(onLink).toHaveBeenCalledExactlyOnceWith("sheet", "s/s/go");
  expect(agent.read()).toContain("[confirm/confirm press]");
});

it("keeps legacy data-only dispatch on authored non-filled entries without opt-ins", () => {
  const legacy: Definition = {
    ...def,
    meta: { ...def.meta, id: "LegacyFixture", successActions: [], actions: { parts: { root: ["press"] } } },
    props: z.strictObject({ goto: z.string() }),
  };
  const screen = {
    id: "s",
    components: [{ id: "nav", c: legacy.meta.id, state: "success" as const, goto: "another" }],
  };
  const onLink = vi.fn();
  const defs = { [legacy.meta.id]: legacy };
  const agent = createAgentAccess({ current: () => screen, defs, store: createInteractionStore(), onLink });
  expect(agent.act({ address: "s/nav", action: "press" }).ok).toBe(true);
  expect(onLink).toHaveBeenCalledExactlyOnceWith("another", "s/nav");
});

it("reads opted-in success details and exposes only the declared actions", () => {
  const result: Definition = {
    ...def,
    props: z.strictObject({ title: text(30), total: z.number() }),
    meta: {
      ...def.meta,
      readSuccess: true,
      read: (input, state) => [`${(input as { total: number }).total} achieved in ${state}`],
    },
  };
  const screen = {
    id: "s",
    components: [
      { id: "result", c: def.meta.id, state: "success" as const, title: "Practice complete", total: 3 },
    ],
  };
  const defs = { [def.meta.id]: result };
  const controller = createScreenController({ screen, defs });
  const expected =
    'screen s\nresult SuccessFixture (success) 3 achieved in success — "Practice complete" [result/reset press]';
  expect(readScreen(screen, defs)).toBe(expected);
  expect(controller.read()).toBe(expected);
  expect(controller.press("result/other").ok).toBe(false);
  expect(controller.press("result/reset").ok).toBe(true);
  const { readSuccess: _readSuccess, ...meta } = result.meta;
  const legacy = createScreenController({ screen, defs: { ...defs, [def.meta.id]: { ...result, meta } } });
  expect(legacy.read()).toBe("screen s\nresult SuccessFixture (success) [result/reset press]");
});
