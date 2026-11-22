import { describe, expect, it } from "vitest";
import {
  atDeviceTime,
  components,
  createRegistry,
  packReady,
  placeholderTitle,
  planAct,
  readScreen,
  type StateName,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";

const def = components.SlaPolicy;
const [ongoing, complete] = def.examples;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const definition = { SlaPolicy: def };
const screen = (input = ongoing!, state: StateName = "filled") => ({
  id: "home",
  components: [{ ...input, id: "sl", c: "SlaPolicy", state }],
});
const draw = (input = ongoing!, state: StateName = "filled") =>
  renderInstance("SlaPolicy", input, state, theme, { component: "sl" });

describe("SlaPolicy wire contract", () => {
  it.each(def.examples)("accepts its domain examples", (example) => {
    expect(def.props.safeParse(example).success).toBe(true);
  });
  it.each([
    { requestRef: "x".repeat(33) },
    { tier: "x".repeat(25) },
    { policyGoto: "not a screen" },
    { openedAt: "2026-11-22T00:00:00" },
    { openedAt: "2026-02-30T00:00:00Z" },
    { openedAt: "2026-11-22T00:00:00+24:00" },
    { responseDueAt: "2026-11-21T23:59:59Z" },
    { resolutionDueAt: "2026-11-22T01:00:00Z" },
    { resolvedAt: "2026-11-22T01:00:00Z" },
    { resolutionRemaining: 5 },
    { hasPolicy: true },
    { detail: "compact" },
  ])("rejects invalid or calculated input %j", (change) => {
    expect(def.props.safeParse({ ...ongoing, ...change }).success).toBe(false);
  });
  it("uses shared cast labels and neutral seed data", () => {
    const empty = def.fallback({ cast: { things: [], items: [] } });
    const fallback = def.fallback({
      cast: {
        things: [{ type: "ticket", fields: ["title"] }],
        items: [{ id: "one", type: "ticket", title: "Light repair", sample: true }],
      },
    });
    expect(def.props.parse(empty)).toMatchObject({ requestRef: placeholderTitle(0), paused: true });
    expect(def.props.parse(fallback)).toMatchObject({ requestRef: "Light repair" });
    expect(createRegistry({ packs: ["requests"] }).ids.includes(def.meta.id)).toBe(packReady("requests"));
  });
});

describe("SlaPolicy views and actions", () => {
  it("shows the full tracker or one compact row and retains declared addresses", () => {
    const full = addressedElements(draw());
    for (const part of ["root", "request", "tier", "response", "resolution", "meter", "policy"])
      expect(full.has(`home/sl/${part}`)).toBe(true);
    const brief = addressedElements(draw(complete));
    for (const part of ["root", "tier", "resolution"]) expect(brief.has(`home/sl/${part}`)).toBe(true);
    for (const part of ["request", "response", "meter", "policy", "status"])
      expect(brief.has(`home/sl/${part}`)).toBe(false);
  });
  it("shapes loading without an active link and announces host feedback", () => {
    expect(draw(ongoing, "loading")).toContain('aria-busy="true"');
    expect(addressedElements(draw(ongoing, "loading")).has("home/sl/policy")).toBe(false);
    expect(draw(complete, "success")).toContain("Both targets met");
    expect(draw(ongoing, "error")).toContain("SLA breached");
  });
  it("offers and follows the link only when the policy is linked and not loading or in a host error", () => {
    const action = { address: "sl/policy", action: "press" } as const;
    const act = (input: ReturnType<typeof screen>) => planAct(input, definition, {}, [action], null);
    expect(readScreen(screen(), definition)).toContain("[sl/policy press");
    expect(act(screen())).toMatchObject({ ok: true, links: [{ goto: "service_rules" }] });
    expect(act(screen(ongoing, "success")).ok).toBe(true);
    expect(act(screen(complete)).ok).toBe(false);
    expect(act(screen(ongoing, "loading")).ok).toBe(false);
    expect(act(screen(ongoing, "error")).ok).toBe(false);
  });
  it("uses host time for both live projection and reading across a deadline", () => {
    const input = { ...ongoing!, respondedAt: undefined };
    const page = screen(input);
    let now = Date.parse("2026-11-22T03:59:59Z");
    const controller = createScreenController({ screen: page, defs: definition, now: () => now });
    try {
      expect(controller.liveControls(def.meta, def.props.parse(input), "sl")).toMatchObject({
        responseRemaining: 1000,
      });
      expect(readScreen(page, definition, {}, "en", atDeviceTime(undefined, now))).toContain("Pending");
      now += 1000;
      controller.tick();
      expect(controller.liveControls(def.meta, def.props.parse(input), "sl")).toMatchObject({
        responseRemaining: 0,
      });
      expect(readScreen(page, definition, {}, "en", atDeviceTime(undefined, now))).toContain("SLA breached");
    } finally {
      controller.dispose();
    }
  });
});
