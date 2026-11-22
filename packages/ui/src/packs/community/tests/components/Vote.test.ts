import { describe, expect, it, vi } from "vitest";
import { atDeviceTime, components, createRegistry, packReady, readComponent } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderExample, renderInstance } from "../../../../../test/render";
import { voteRecordKind } from "../../copy";

const def = components.Vote;
const { props, meta, examples, fallback, probes } = def;
const input = examples[0]!;
const sample = props.parse(input);
const opens = Date.parse(sample.opens);
const closes = Date.parse(sample.closes);
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const choices = ["for", "against", "abstain"] as const;
const address = (part: string) => `home/v1/${part}`;
const screenOf = (patch = {}) => ({ id: "home", components: [{ ...input, ...patch, c: "Vote", id: "v1" }] });
const host = (patch = {}) => ({
  [voteRecordKind]: [
    { ...sample, chair: "ana", viewer: "ana", eligible: ["ana", "cal", "lee", "jo"], ...patch },
  ],
});

// prettier-ignore
describe("Vote contract", () => {
  it.each(examples)("accepts real examples", (value) => expect(props.safeParse(value).success).toBe(true));

  it("bounds data, compares offset instants and rejects derived props", () => {
    const ballots = Array.from({ length: 30 }, (_, i) => ({ memberId: `m_${i}`, choice: "abstain" }));
    const maximum = { ...input, ballots, quorum: 30, motion: "x".repeat(120), detail: "x".repeat(240), voteId: "a".repeat(24) };
    expect(props.safeParse(maximum).success).toBe(true);
    for (const patch of [
      { voteId: "invalid-id" }, { motion: " " }, { motion: "x".repeat(121) }, { detail: "x".repeat(241) },
      { opens: "2026-11-18T19:00:00" }, { closes: "2026-11-18T21:00:00+02:00" },
      { quorum: 0 }, { quorum: 31 }, { quorum: 1.5 }, { rule: "plurality" },
      { ballots: [...ballots, { memberId: "extra", choice: "for" }] },
      { ballots: [{ memberId: "ana", choice: "maybe" }] },
      { ballots: [input.ballots[0], input.ballots[0]] }, { style: "summary" }, { arrange: "strip" },
      { color: "#fff" }, { own_ballot: "for" }, { can_vote: true }, { decision: "passed" }, { counts: { for: 99 } },
    ]) expect(props.safeParse({ ...input, ...patch }).success, JSON.stringify(patch)).toBe(false);
  });

  it("uses cast and neutral seeds, and preserves probes, tiers and pack readiness", () => {
    const empty = { things: [], items: [] };
    const named = (name: string | number) => ({
      things: [{ type: "motion", fields: ["name"] }],
      items: [{ id: "motion", type: "motion", sample: true, name }],
    });
    for (const cast of [empty, named("Extend weekend hours"), named(42)])
      expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast: empty }).motion).toBe("Item one");
    expect(fallback({ cast: named("Extend weekend hours") }).motion).toBe("Extend weekend hours");
    expect(meta).toMatchObject({ tier: "people", weight: 2, confirmParts: ["cancel"] });
    expect(createRegistry({ packs: ["community"] }).ids.includes("Vote")).toBe(packReady("community"));
    expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Choice" }));
    expect(probes).toContainEqual(expect.objectContaining({ kind: "read", expect: { address: "v1/for", action: "select" } }));
  });
});

// prettier-ignore
describe("Vote view and reading", () => {
  const draw = (raw: unknown = input, state: "filled" | "loading" | "success" | "error" = "filled") =>
    renderExample("Vote", raw, state, theme, { component: "v1" });

  it("matches the addressed ballot UI and never reveals the tally during voting", () => {
    const { html, deviceData } = draw();
    const parts = addressedElements(html);
    for (const part of ["motion", "detail", "opens", "closes", "status", "quorum", "rule", "participation", "own", "cancel"])
      expect(parts.has(address(part)), part).toBe(true);
    expect(parts.has(address("decision"))).toBe(false);
    for (const choice of choices) expect(parts.get(address(choice))?.attributes).toContain('role="radio"');
    expect(parts.get(address("for"))?.attributes).toContain('aria-checked="true"');
    const reading = readComponent(def, input, "v1", "filled", {}, undefined, deviceData).join("\n");
    expect(reading).toContain("4 of 8 cast");
    expect(reading).toContain("Your ballot: For");
    for (const choice of choices) expect(reading).toContain(`[v1/${choice} select`);
    expect(reading).toContain("[v1/cancel press");
    expect(reading).not.toMatch(/For: \d|Motion passed|ana|lee/);
    const alternate = draw({ ...input, arrange: "rows" });
    expect([...addressedElements(alternate.html).keys()]).toEqual([...parts.keys()]);
  });

  it("shows aggregate counts only in closed results and retains cancelled motions", () => {
    const result = draw(examples[1]!);
    const parts = addressedElements(result.html);
    expect(parts.get(address("decision"))?.text).toEqual(["Motion passed"]);
    expect(choices.map((choice) => parts.get(address(choice))?.text)).toEqual([["2"], ["1"], ["1"]]);
    expect(result.html).not.toMatch(/role="radio"|role="button"/);
    const reading = readComponent(def, examples[1], "v1", "filled", {}, undefined, result.deviceData).join("\n");
    expect(reading).toContain("For: 2");
    expect(reading).not.toMatch(/\[v1\//);
    const cancelled = draw(examples[3]!);
    expect(cancelled.html).toContain("Motion cancelled");
    expect(cancelled.html).not.toMatch(/role="radio"|role="button"|Motion did not pass/);
  });

  it.each([
    ["loading", 'aria-busy="true"'],
    ["success", "Ballot saved"],
    ["error", "Could not save your ballot"],
  ] as const)("renders %s without ballot or cancel controls", (state, text) => {
    const { html } = draw(input, state);
    expect(html).toContain(text);
    if (state === "error") expect(html).toContain("Ballot on record: For");
    expect(html).not.toMatch(/role="radio"|role="button"/);
  });
});

it("offers all fixed choices and sends replacements to the host without changing ballots locally", () => {
  const onAction = vi.fn();
  const runtime = createScreenController({
    screen: screenOf(),
    defs: { Vote: def },
    now: () => opens,
    deviceData: host(),
    onAction,
  });
  try {
    expect(runtime.act({ address: "v1/for", action: "select", value: "against" }).ok).toBe(false);
    for (const choice of choices) {
      expect(runtime.act({ address: `v1/${choice}`, action: "select", value: choice }).ok).toBe(true);
      expect(onAction).toHaveBeenLastCalledWith({
        address: address(choice),
        action: "select",
        value: choice,
      });
    }
    expect(runtime.read()).toContain("Your ballot: For");
    expect(runtime.snapshotScreen().components[0]?.ballots).toEqual(input.ballots);
    const updated = host({ ballots: [{ memberId: "ana", choice: "abstain" }, ...sample.ballots.slice(1)] });
    const after = readComponent(def, input, "v1", "filled", {}, undefined, atDeviceTime(updated, opens)).join(
      "\n",
    );
    expect(after).toContain("Your ballot: Abstain");
    expect(after).toContain("4 of 8 cast");
  } finally {
    runtime.dispose();
  }
});

describe("Vote action gates", () => {
  it.each([
    ["anonymous", {}, undefined, opens, false, false],
    ["ineligible", {}, host({ viewer: "outsider" }), opens, false, false],
    ["eligible non-chair", {}, host({ viewer: "lee" }), opens, true, false],
    ["scheduled chair", {}, host(), opens - 1, false, true],
    ["closed chair", {}, host(), closes, false, false],
    ["cancelled chair", {}, host({ cancelled: true }), opens, false, false],
    ["result chair", { style: "result" }, host(), opens, false, false],
  ] as const)("gates actions for %s", (_name, patch, deviceData, now, vote, cancel) => {
    const runtime = createScreenController({
      screen: screenOf(patch),
      defs: { Vote: def },
      now: () => now,
      deviceData,
    });
    try {
      for (const choice of choices) expect(runtime.press(`v1/${choice}`).ok).toBe(vote);
      expect(runtime.press("v1/cancel").ok).toBe(cancel);
      expect(Boolean(runtime.confirmation)).toBe(cancel);
    } finally {
      runtime.dispose();
    }
  });

  it("dispatches cancellation only after confirmation and expires an open confirmation at close", () => {
    vi.useFakeTimers({ now: opens - 1 });
    const onAction = vi.fn();
    const runtime = createScreenController({
      screen: screenOf(),
      defs: { Vote: def },
      deviceData: host(),
      onAction,
    });
    try {
      runtime.mount();
      expect(runtime.actionsAt("v1/for")).toEqual([]);
      vi.advanceTimersByTime(1);
      expect(runtime.actionsAt("v1/for")).toEqual(["select"]);
      expect(runtime.press("v1/cancel").ok).toBe(true);
      expect(onAction).not.toHaveBeenCalled();
      expect(runtime.press("confirm/confirm").ok).toBe(true);
      expect(onAction).toHaveBeenCalledWith({ address: address("cancel"), action: "press" });
      expect(runtime.press("v1/cancel").ok).toBe(true);
      vi.advanceTimersByTime(closes - opens);
      expect(runtime.actionsAt("v1/for")).toEqual([]);
      expect(runtime.confirmation).toBeUndefined();
      expect(runtime.press("confirm/confirm").ok).toBe(false);
      expect(onAction).toHaveBeenCalledTimes(1);
    } finally {
      runtime.dispose();
      vi.useRealTimers();
    }
    expect(renderInstance("Vote", input, "filled", theme)).not.toMatch(/role="radio"|role="button"/);
  });
});
