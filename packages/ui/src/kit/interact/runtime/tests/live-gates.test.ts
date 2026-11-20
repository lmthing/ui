import { expect, it, vi } from "vitest";
import { z } from "zod";
import { planAct, readScreen, text, type Definition, type ScreenLike } from "../../../../catalog";
import { createAgentAccess, createInteractionStore, createScreenController } from "../../index";

const props = z.strictObject({
  reason: text(12).optional(),
  blocker: z.enum(["access", "parts"]).optional(),
  checks: z.array(z.strictObject({ required: z.boolean(), done: z.boolean() })),
});

function fixture() {
  const facts = { staff: true, linked: false };
  const def: Definition = {
    meta: {
      id: "GateFixture",
      group: "input",
      purpose: "Try gated edits.",
      pick: "Test staged input.",
      region: "body",
      weight: 1,
      tier: "phone",
      realPath: "Edit locally.",
      items: { key: "checks", parts: ["root", "check"] },
      confirmParts: ["save"],
      live: {
        text: { reason: { prop: "reason", max: 12 } },
        checks: { check: "done" },
        derive: (props, instance) => ({
          allowed: instance === "entry" && facts.staff,
          ready:
            facts.linked &&
            String(props.reason ?? "").trim().length > 0 &&
            (props.checks as { done: boolean }[]).every(({ done }) => done) &&
            props.blocker === undefined,
        }),
      },
      selections: {
        blocker: { prop: "blocker", choices: ["access", "parts"], runtime: true, clear: "none" },
      },
      actions: {
        parts: { reason: ["type"], blocker: ["select"], save: ["press"], send: ["send"] },
        items: { check: ["check"] },
        when: {
          reason: { allowed: true },
          blocker: { allowed: true },
          check: { allowed: true },
          save: { ready: true, allowed: true },
          send: { ready: true, allowed: true },
        },
      },
      read: (props) => [(props as { blocker?: string }).blocker ?? "unblocked"],
    },
    props,
    fallback: () => ({}),
    examples: [],
    probes: [],
  };
  const screen: ScreenLike = {
    id: "s",
    components: [
      {
        id: "entry",
        c: def.meta.id,
        blocker: "parts",
        checks: [{ required: true, done: false }],
      },
    ],
  };
  return { facts, screen, defs: { [def.meta.id]: def }, def };
}

const type = (value: string) => ({ address: "entry/reason", action: "type", value });
const check = { address: "entry/r1/check", action: "check" };
const block = (value: string) => ({ address: "entry/blocker", action: "select", value });
const send = { address: "entry/send", action: "send" };
const save = { address: "entry/save", action: "press" };
const retryConfirm = { address: "confirm/confirm", action: "press" };
const edits = [type("ready"), check, block("none")];

it("projects staged text, checks and enum clearing without widening Writer props", () => {
  const { screen, defs, def, facts } = fixture();
  facts.linked = true;
  expect(def.props.safeParse({ checks: [], blocker: "none" }).success).toBe(false);
  expect(def.props.safeParse({ checks: [], allowed: true, ready: true }).success).toBe(false);
  const initial = readScreen(screen, defs);
  expect(initial).toContain("[entry/r1/check check:todo]");
  expect(initial).toContain('choices ["access","parts","none"]');
  expect(planAct(screen, defs, {}, [block("other")])).toMatchObject({ ok: false, code: "invalid_value" });
  expect(planAct(screen, defs, {}, [type("x".repeat(13))])).toMatchObject({
    ok: false,
    code: "invalid_value",
  });
  expect(planAct(screen, defs, {}, [type(" "), check, block("none"), send])).toMatchObject({
    ok: false,
    at: 3,
  });
  const staged = planAct(screen, defs, {}, [...edits, send]);
  expect(staged.ok).toBe(true);
  if (!staged.ok) return;
  expect(readScreen(screen, defs, staged.values)).toContain("unblocked");
  expect(readScreen(screen, defs, staged.values)).toContain("[entry/r1/check check:done]");
  expect(planAct(screen, defs, staged.values, [check, send])).toMatchObject({ ok: false, at: 1 });
  expect(planAct(screen, defs, staged.values, [block("access"), send])).toMatchObject({ ok: false, at: 1 });
  expect(planAct(screen, defs, staged.values, [type(""), send])).toMatchObject({ ok: false, at: 1 });
});

it("honors linked work, host-bound roles, rejected text and staged mounting constraints", () => {
  const { screen, defs, facts } = fixture();
  const onAction = vi.fn();
  const controller = createScreenController({ screen, defs, requireMounted: true, onAction });
  edits.forEach(({ address }) => controller.registerPart(address));
  controller.registerDisabledPart(send.address);
  expect(controller.act([...edits, send])).toMatchObject({ ok: false, at: 3 });
  expect(onAction).not.toHaveBeenCalled();
  expect(controller.store.get("s/entry/r1/check")).toBeUndefined();
  facts.linked = true;
  expect(controller.act([...edits, send], { dryRun: true }).ok).toBe(true);
  expect(onAction).not.toHaveBeenCalled();
  expect(controller.act([...edits, send]).ok).toBe(true);
  expect(controller.snapshotScreen().components[0]).toEqual(screen.components[0]);
  expect(onAction).toHaveBeenLastCalledWith({ ...send, address: "s/entry/send" });
  expect(controller.edit("entry/reason", "x".repeat(13)).ok).toBe(false);
  expect(controller.read()).not.toContain("x".repeat(13));
  controller.registerPart(save.address);
  expect(controller.press(save.address).ok).toBe(true);
  expect(controller.confirmation).toBeDefined();
  facts.staff = false;
  expect(controller.act(retryConfirm).ok).toBe(false);
  expect(onAction).toHaveBeenCalledTimes(4);
});

it("revalidates a host-gated confirmation on the standalone agent path", () => {
  const { screen, defs, facts } = fixture();
  const agent = createAgentAccess({ current: () => screen, defs, store: createInteractionStore() });
  facts.linked = true;
  expect(agent.act([...edits, save]).ok).toBe(true);
  expect(agent.read()).toContain("[confirm/confirm press]");
  facts.linked = false;
  expect(agent.act(retryConfirm).ok).toBe(false);
});

it("keeps a staged derived row selection out of the snapshot but exposes it to the next gate", () => {
  const { def } = fixture();
  const triage: Definition = {
    ...def,
    props: def.props,
    meta: {
      ...def.meta,
      confirmParts: [],
      select: { prop: "decision", value: "index" },
      live: { derive: (props) => ({ selected: props.decision === 0 }) },
      actions: {
        items: { root: ["select"] },
        parts: { save: ["press"] },
        when: { save: { selected: true } },
      },
    },
  };
  const defs = { [triage.meta.id]: triage };
  const screen = {
    id: "s",
    components: [{ id: "entry", c: triage.meta.id, checks: [{ required: true, done: false }] }],
  };
  const controller = createScreenController({ screen, defs });
  expect(controller.act([{ address: "entry/r1", action: "select" }, save]).ok).toBe(true);
  expect(controller.snapshotScreen()).toEqual(screen);
  expect(controller.canPress(save.address)).toBe(true);
});

it("delivers the draft from the admitted send step after commit on both runtime paths", () => {
  const { def, screen } = fixture();
  const bound: Definition = {
    ...def,
    meta: {
      ...def.meta,
      live: { text: def.meta.live!.text!, send: { send: "reason" } },
      actions: { parts: { reason: ["type"], send: ["send"] } },
    },
  };
  const defs = { [bound.meta.id]: bound };
  const steps = [type("A"), send, type("B")];
  for (const mounted of [false, true]) {
    const onSend = vi.fn();
    const store = createInteractionStore();
    const runtime = mounted
      ? createScreenController({ screen, defs, store, onSend })
      : createAgentAccess({ current: () => screen, defs, store, onSend });
    expect(runtime.act(steps, { dryRun: true }).ok).toBe(true);
    expect(runtime.act([...steps, type("1234567890123")]).ok).toBe(false);
    expect(onSend).not.toHaveBeenCalled();
    expect(runtime.act(steps).ok).toBe(true);
    expect(onSend).toHaveBeenCalledExactlyOnceWith("A", "s/entry/reason");
    expect(store.get("s/entry/reason")).toBe("B");
  }
});
