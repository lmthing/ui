import { describe, expect, it, vi } from "vitest";
// prettier-ignore
import { components, createRegistry, packReady, planAct, readScreen, type ActStep, type CastLike, type ScreenLike } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { RequestResolution } from "../../components";

const def = components.RequestResolution;
const { meta, props, examples, fallback, probes } = def;
const [proposal, receipt] = examples;

// prettier-ignore
describe("RequestResolution contract", () => {
  it.each(examples)("accepts a domain example", (example) => {
    expect(props.safeParse(example).success).toBe(true);
  });
  it("accepts inclusive bounds and defaults", () => {
    expect(props.parse({
      number: "n".repeat(12), summary: "s".repeat(120), reason: "r".repeat(120),
      checks: Array(6).fill({ text: "c".repeat(36), done: true }),
      photos: ["local:1", "local:2", "lib:fern", "lib:basil"],
    })).toMatchObject({ style: "review", outcome: "repaired", surface: "card", media: "thumb" });
  });
  it.each([
    { number: "x".repeat(13) }, { summary: "x".repeat(121) }, { duplicateOf: "x".repeat(13) },
    { duplicateOf: receipt!.number }, { duplicateOf: undefined }, { outcome: "unable" },
    { outcome: "repaired" }, { outcome: "closed" }, { reason: undefined }, { reason: " " },
    { reason: "x".repeat(121) }, { checks: [] }, { checks: Array(7).fill(receipt!.checks[0]) },
    { checks: [{ text: "x".repeat(37), done: false }] }, { checks: [{ text: "Verify", done: 1 }] },
    { photos: Array(5).fill("local:1") }, { photos: ["https://example.com/photo"] },
    { style: "saved" }, { media: "icon" }, { canAccept: true }, { liveReason: "test" }, { color: "red" },
  ])("rejects invalid input %j", (edit) => {
    expect(props.safeParse({ ...receipt, ...edit }).success).toBe(false);
  });
  it("keeps tiers, confirmation and the core-first choose and variant probes", () => {
    expect(meta).toMatchObject({
      status: "ready", tier: "phone", partTiers: { accept: "people", reopen: "people" }, confirmParts: ["resolve"],
    });
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: meta.id }),
        expect.objectContaining({ kind: "choose", expect: "Success" }),
        expect.objectContaining({ kind: "write", variant: { axis: "media", value: "none" } }),
        expect.objectContaining({ kind: "read", expect: { address: "r1/accept", action: "press" } }),
      ]),
    );
    expect(createRegistry({ packs: ["requests"] }).ids.includes(meta.id)).toBe(packReady("requests"));
  });
});

describe("RequestResolution fallback", () => {
  const empty: CastLike = { things: [], items: [] };
  const matching: CastLike = {
    things: [{ type: "report", fields: ["title", "place"] }],
    items: [{ id: "r", type: "report", sample: true, title: "Water leak", place: "Main hall" }],
  };
  const malformed: CastLike = { ...matching, items: [{ ...matching.items[0]!, title: 3, place: " " }] };
  it("uses neutral placeholders and bounded cast text", () => {
    for (const cast of [empty, matching, malformed])
      expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast: empty })).toMatchObject({
      checks: [{ text: "Item one", done: false }],
      photos: [],
    });
    expect(fallback({ cast: matching })).toMatchObject({
      summary: "Main hall",
      checks: [{ text: "Water leak", done: false }],
    });
  });
});

const resolve = { address: "r1/resolve", action: "press" };
const accept = { address: "r1/accept", action: "press" };
const reopen = { address: "r1/reopen", action: "press" };
const confirm = { address: "confirm/confirm", action: "press" };
const check = { address: "r1/r1/check", action: "check", value: false };
const typeReason = (value: string) => ({ address: "r1/reason", action: "type", value });
const outcome = (value: string) => ({ address: "r1/outcome", action: "select", value });

function fixture(
  input: Record<string, unknown> = proposal!,
  state?: ScreenLike["components"][number]["state"],
) {
  const facts = {
    staff: true,
    requester: true,
    workComplete: true,
    saved: true,
    resolved: true,
    known: true,
    canonical: true,
  };
  const derive = RequestResolution.requestResolutionGates((id) =>
    id === "r1" && facts.known
      ? { ...facts, duplicateMatches: (target) => facts.canonical && target === receipt!.duplicateOf }
      : undefined,
  );
  const defs = { RequestResolution: { ...def, meta: { ...meta, live: { ...meta.live, derive } } } };
  const screen: ScreenLike = {
    id: "desk",
    components: [{ ...input, id: "r1", c: meta.id, ...(state && { state }) }],
  };
  return { facts, defs, screen, act: (...steps: ActStep[]) => planAct(screen, defs, {}, steps) };
}

describe("RequestResolution live read and act", () => {
  it("stages checks and a reason-based outcome without rewriting the wire snapshot", () => {
    const { facts, defs, screen, act } = fixture();
    facts.workComplete = false;
    expect(act(resolve).ok).toBe(false);
    expect(act(outcome("workaround"), resolve)).toMatchObject({ ok: false, at: 1 });
    expect(act(outcome("unable")).ok).toBe(false);
    expect(act(outcome("duplicate")).ok).toBe(false);
    expect(act(typeReason("x".repeat(121))).ok).toBe(false);
    const staged = act(check, typeReason("Cannot source the part."), outcome("unable"));
    expect(staged.ok).toBe(true);
    if (!staged.ok) return;
    const reading = readScreen(screen, defs, staged.values);
    expect(reading).toContain('[r1/outcome select = "unable"');
    expect(reading).toContain("[r1/r1/check check:todo]");
    expect(reading).toContain("[r1/resolve press]");
    expect(reading).toContain("Cannot source the part.");
    expect(reading).toContain("photo:local:2");
    expect(screen.components[0]).toMatchObject({ checks: proposal!.checks });
    expect(planAct(screen, defs, staged.values, [typeReason(" "), resolve])).toMatchObject({
      ok: false,
      at: 1,
    });
  });

  it("submits only a confirmed duplicate and rechecks the canonical match on confirmation", () => {
    const { screen, defs } = fixture({ ...receipt, style: "review" });
    const onAction = vi.fn();
    const controller = createScreenController({ screen, defs, onAction });
    expect(controller.act(resolve).ok).toBe(true);
    expect(controller.confirmation).toBeDefined();
    expect(onAction).not.toHaveBeenCalledWith(expect.objectContaining({ address: "desk/r1/resolve" }));
    expect(controller.act(confirm).ok).toBe(true);
    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({ address: "desk/r1/resolve" }));

    const fresh = fixture({ ...receipt, style: "review" });
    const stale = createScreenController({ screen: fresh.screen, defs: fresh.defs });
    expect(stale.act(resolve).ok).toBe(true);
    fresh.facts.canonical = false;
    expect(stale.act(confirm).ok).toBe(false);
    expect(stale.snapshotScreen()).toEqual(fresh.screen);
  });
});

describe("RequestResolution receipt and states", () => {
  it("requires a saved, resolved, verified receipt to accept, and a fresh reason to reopen", () => {
    const { facts, screen, defs, act } = fixture(receipt!);
    expect(readScreen(screen, defs)).toContain("[r1/accept press !needs-people]");
    expect(act(accept).ok).toBe(true);
    expect(act(check).ok).toBe(false);
    expect(act(reopen).ok).toBe(false);
    expect(act(typeReason(" "), reopen)).toMatchObject({ ok: false, at: 1 });
    const draft = act(typeReason("The latch still sticks."));
    expect(draft.ok).toBe(true);
    if (draft.ok) expect(readScreen(screen, defs, draft.values)).toContain("[r1/reopen press !needs-people]");
    expect(act(typeReason("The latch still sticks."), reopen).ok).toBe(true);
    facts.resolved = false;
    expect(act(accept).ok).toBe(false);
    facts.saved = false;
    expect(act(typeReason("The latch still sticks.")).ok).toBe(false);
    expect(fixture({ ...receipt, checks: [{ text: "Verify", done: false }] }).act(accept).ok).toBe(false);
  });

  it("fails closed without host facts or the correct role", () => {
    const review = fixture(),
      saved = fixture(receipt!);
    review.facts.staff = saved.facts.requester = false;
    for (const step of [resolve, check, outcome("workaround"), typeReason("note")])
      expect(review.act(step).ok).toBe(false);
    for (const step of [accept, reopen, typeReason("note")]) expect(saved.act(step).ok).toBe(false);
    review.facts.staff = true;
    review.facts.known = false;
    expect(review.act(resolve).ok).toBe(false);
  });

  it.each(["loading", "error"] as const)("offers no actions in %s", (state) => {
    const { act, defs, screen } = fixture(receipt!, state);
    expect(readScreen(screen, defs)).toContain(`(${state})`);
    for (const step of [check, resolve, accept, reopen, typeReason("note"), outcome("repaired")])
      expect(act(step).ok).toBe(false);
  });
  it("offers only the fresh-reason reopening flow in success", () => {
    const { act, defs, screen } = fixture(receipt!, "success");
    expect(readScreen(screen, defs)).toContain("Resolution accepted");
    expect(act(accept).ok).toBe(false);
    expect(act(reopen).ok).toBe(false);
    expect(act(typeReason("Still broken."), reopen).ok).toBe(true);
  });
});
