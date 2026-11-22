import { describe, expect, it, vi } from "vitest";
import { components, createRegistry, packReady, readComponent } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";
import { minutesProjection } from "../../copy";

const def = components.Minutes;
const { meta, props, examples, fallback, probes } = def;
const record = examples[0]!,
  followUp = examples[1]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const draw = (input: unknown, state: "filled" | "empty" | "loading" | "success" | "error" = "filled") =>
  renderInstance("Minutes", input, state, theme, { component: "m1" });
const addr = (part: string) => `home/m1/${part}`;
const screen = (input = record) => ({ id: "home", components: [{ ...input, c: "Minutes", id: "m1" }] });

describe("Minutes schema and fallback", () => {
  it.each(examples)("accepts a domain example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("preserves bounds, relates actions to decisions and rejects injected authority", () => {
    const decisions = Array.from({ length: 8 }, (_, i) => ({ ...record.decisions[0]!, id: `decision_${i}` }));
    const actions = Array.from({ length: 12 }, (_, i) => ({
      ...record.actions[0]!,
      id: `action_${i}`,
      decisionId: "decision_0",
    }));
    expect(props.safeParse({ ...record, decisions, actions }).success).toBe(true);
    for (const patch of [
      { approvedAt: undefined },
      { approvedBy: undefined },
      { decisions: [] },
      { decisions: [...decisions, record.decisions[0]] },
      { actions: [...actions, record.actions[0]] },
      { actions: [{ ...actions[0], decisionId: "missing" }] },
      { can_approve: true },
      { color: "#fff" },
    ])
      expect(props.safeParse({ ...record, ...patch }).success).toBe(false);
  });
  it("keeps the bounded fallback, pack gate and core-first probe", () => {
    const empty = { things: [], items: [] };
    const cast = (name: string | number) => ({
      things: [{ type: "record", fields: ["name"] }],
      items: [{ id: "sample", type: "record", sample: true, name }],
    });
    for (const value of [empty, cast("Meeting"), cast(4)])
      expect(props.safeParse(fallback({ cast: value })).success).toBe(true);
    expect(fallback({ cast: empty }).title).toBe("Item one");
    expect(fallback({ cast: cast("Meeting") }).title).toBe("Meeting");
    expect(createRegistry({ packs: ["community"] }).ids.includes("Minutes")).toBe(packReady("community"));
    expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Checklist" }));
  });
});

describe("Minutes states and parts", () => {
  it("draws the official record, linked motion and readonly completion marks", () => {
    const parts = addressedElements(draw(record));
    expect(parts.get(addr("r1/root"))?.attributes).toContain('role="link"');
    expect(parts.get(addr("r1/motion"))?.text).toEqual(["Open motion"]);
    expect(parts.get(addr("r2/done"))?.attributes).toContain('role="img"');
    expect(parts.get(addr("approval"))?.text.join("")).toContain("Approved by Ana");
    expect([...addressedElements(draw({ ...record })).keys()]).toEqual([...parts.keys()]);
    const reading = readComponent(def, record, "m1").join("\n");
    for (const line of [
      "Buy a shared tool shed",
      "Open motion",
      "[m1/r1 press",
      "Owner: Ana",
      "Approved by Ana",
    ])
      expect(reading).toContain(line);
  });
  it("retains addresses and decision references without drawing decision prose in follow-up mode", () => {
    const parts = addressedElements(draw(followUp));
    expect(parts.has(addr("r1/root"))).toBe(true);
    expect(parts.has(addr("r1/text"))).toBe(false);
    expect(parts.has(addr("r2/root"))).toBe(true);
    expect(parts.get(addr("r2/decision"))?.text).toEqual(["Adopt the winter route"]);
    expect(readComponent(def, followUp, "m1").join("\n")).not.toContain("Start at the park gate");
  });
  it.each([
    ["empty", "Nothing here yet"],
    ["success", "Minutes updated"],
    ["error", "Could not save the minutes"],
    ["loading", 'aria-busy="true"'],
  ] as const)("draws %s without offering controls", (state, copy) => {
    const html = draw(record, state);
    expect(html).toContain(copy);
    expect(html).not.toMatch(/role="(?:link|button|checkbox)"/);
  });
});

describe("Minutes host actions", () => {
  it("only opens verified closed, uncancelled motion links in the host-bound record", () => {
    for (const [closed, cancelled] of [
      [true, false],
      [false, false],
      [true, true],
    ] as const) {
      const onLink = vi.fn();
      const derive = minutesProjection(() => ({
        viewer: "ana",
        today: "2026-11-21",
        motion: () => ({ goto: "motion", closed, cancelled }),
      }));
      const Minutes = { ...def, meta: { ...meta, live: { ...meta.live, derive } } };
      const runtime = createScreenController({ screen: screen(), defs: { Minutes }, onLink });
      try {
        expect(runtime.press("m1/r1").ok).toBe(closed && !cancelled);
        if (closed && !cancelled) expect(onLink).toHaveBeenCalledWith("motion", addr("r1"));
        else expect(onLink).not.toHaveBeenCalled();
      } finally {
        runtime.dispose();
      }
    }
  });
});

describe("Minutes permissions", () => {
  it("requires chair authority for draft approvals and ownership or secretary authority for checks", () => {
    for (const viewer of ["ana", "lee", "other"]) {
      const bound = (input = record) =>
        createScreenController({
          screen: screen(input),
          defs: {
            Minutes: {
              ...def,
              meta: {
                ...meta,
                live: {
                  ...meta.live,
                  derive: minutesProjection(() => ({
                    viewer,
                    today: "2026-11-21",
                    motion: () => undefined,
                  })),
                },
              },
            },
          },
        });
      const approved = bound(),
        draft = bound({ ...record, approvedAt: undefined, approvedBy: undefined });
      try {
        expect(approved.press("m1/approve").ok).toBe(false);
        expect(draft.press("m1/approve").ok).toBe(viewer === "ana");
        expect(approved.act({ address: "m1/r3/done", action: "check", value: true }).ok).toBe(
          viewer === "lee",
        );
        if (viewer === "lee") expect(approved.read()).toContain("[m1/r3/done check:done");
      } finally {
        approved.dispose();
        draft.dispose();
      }
    }
  });
});
