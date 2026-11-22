import { describe, expect, it, vi } from "vitest";
import {
  components,
  createRegistry,
  packReady,
  placeholderTitle,
  readComponent,
  type StateName,
} from "@lmthing/ui/catalog";
import { createScreenController, type HostCommandResult } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";

const def = components.CreditScore;
const [example] = def.examples;
const cast = { things: [], items: [] };
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const draw = (input: unknown = example, state: StateName = "filled") =>
  renderInstance("CreditScore", input, state, theme);
const screen = (state: StateName = "filled") => ({
  id: "home",
  components: [{ ...example, id: "c1", c: "CreditScore", state }],
});

describe("CreditScore schema", () => {
  it.each(def.examples)("accepts planned examples", (input) => {
    expect(def.props.safeParse(input).success).toBe(true);
  });
  it.each([
    { score: 299 },
    { score: 851 },
    { score: 600.5 },
    { previousScore: 1000 },
    { updatedAt: "2026-02-30" },
    { factors: example.factors.slice(0, 3) },
    { factors: Array(7).fill(example.factors[0]) },
    { bureau: "a".repeat(25) },
    { delta: 1 },
    { color: "#fff" },
    { factors: [{ ...example.factors[0], goto: "https://example.com" }, ...example.factors.slice(1)] },
    { factors: [{ ...example.factors[0], impact: "urgent" }, ...example.factors.slice(1)] },
    { factors: [{ ...example.factors[0], value: "a".repeat(17) }, ...example.factors.slice(1)] },
  ])("rejects invalid limits and computed props", (patch) => {
    expect(def.props.safeParse({ ...example, ...patch }).success).toBe(false);
  });
  it("accepts both score endpoints and six factors", () => {
    for (const score of [300, 850]) {
      expect(
        def.props.safeParse({ ...example, score, factors: Array(6).fill(example.factors[0]) }).success,
      ).toBe(true);
    }
  });
});

it("builds valid neutral fallbacks without copying score data from the cast", () => {
  expect(def.fallback({ cast }).bureau).toBe(placeholderTitle(0));
  for (const title of ["Report", "a".repeat(100), 42]) {
    const input = { ...cast, items: [{ id: "bureau", type: "report", title, score: 789, sample: true }] };
    const fallback = def.fallback({ cast: input });
    expect(def.props.safeParse(fallback).success).toBe(true);
    expect(fallback.score).toBe(300);
    expect(fallback.factors).toHaveLength(4);
  }
});

it("offers refresh and only linked factor rows, not loading or error actions", () => {
  const command = { allows: () => true, run: () => ({ status: "accepted" as const }) };
  for (const state of def.meta.states) {
    const controller = createScreenController({
      screen: screen(state),
      defs: components,
      hostCommands: { commands: { refresh_credit_score: command } },
    });
    try {
      expect(controller.actionsAt("c1/refresh")).toEqual(
        state === "empty" || state === "filled" ? ["press"] : [],
      );
      expect(controller.actionsAt("c1/r1")).toEqual(state === "filled" ? ["press"] : []);
      expect(controller.actionsAt("c1/r2")).toEqual([]);
    } finally {
      controller.dispose();
    }
  }
});

describe("CreditScore view and reader", () => {
  it("renders the score, gauge, report, and every stable factor address", () => {
    const html = draw(),
      nodes = addressedElements(html);
    for (const part of ["root", "score", "tier", "gauge", "delta", "report", "refresh", "refresh_label"])
      expect(nodes.has(`home/c1/${part}`), part).toBe(true);
    for (let index = 1; index <= example.factors.length; index++)
      for (const part of ["root", "label", "value", "rating", "impact"])
        expect(nodes.has(`home/c1/r${index}/${part}`), `${index}/${part}`).toBe(true);
    const read = readComponent(def, example, "c1").join("\n");
    for (const text of [
      "752",
      "+18 since your last report",
      "Updated 19 Nov 2026",
      "Fair (580–670)",
      "All on time",
      "High impact",
    ])
      for (const output of [html, read]) expect(output).toContain(text);
    expect(nodes.get("home/c1/r1/root")?.attributes).toContain('role="link"');
    expect(nodes.get("home/c1/r2/root")?.attributes).not.toContain('role="link"');
  });

  it("brief hides only the gauge and omits a delta when there is no previous report", () => {
    const before = addressedElements(draw());
    const brief = { ...example, detail: "brief" };
    const after = addressedElements(draw(brief));
    expect([...before.keys()].filter((address) => !address.endsWith("/gauge"))).toEqual([...after.keys()]);
    const read = readComponent(def, brief, "c1").join("\n");
    expect(read).not.toContain("Fair (580–670)");
    expect(read).toContain("[c1/r1 press→payments");
    expect(draw(def.examples[1])).not.toContain("home/c1/delta");
  });

  it("shows specific empty and error copy and no active factor links while loading", () => {
    expect(draw(example, "empty")).toContain("No credit report available");
    expect(draw(example, "empty")).toContain("home/c1/refresh");
    expect(draw(example, "error")).toContain("Couldn’t reach the credit bureau");
    expect(draw(example, "error")).not.toContain("home/c1/refresh");
    const loading = draw(example, "loading");
    expect(loading).toContain('aria-busy="true"');
    expect(loading).not.toContain('role="link"');
    expect(loading).not.toContain("home/c1/r1/label");
  });
});

it("requires host permission, keeps a refresh pending, and handles rejection without hiding the report", async () => {
  const onLink = vi.fn();
  let finish!: (result: HostCommandResult) => void;
  const run = vi.fn(
    () =>
      new Promise<HostCommandResult>((resolve) => {
        finish = resolve;
      }),
  );
  const controller = createScreenController({
    defs: components,
    screen: screen(),
    onLink,
    hostCommands: { commands: { refresh_credit_score: { allows: () => true, run } } },
  });
  const detached = createScreenController({ defs: components, screen: screen() });
  try {
    expect(detached.press("c1/refresh").ok).toBe(false);
    expect(controller.press("c1/r2").ok).toBe(false);
    expect(controller.press("c1/r1").ok).toBe(true);
    expect(onLink).toHaveBeenCalledWith("payments", "home/c1/r1");
    expect(controller.read()).toContain("[c1/refresh press !needs-service]");
    expect(controller.press("c1/refresh").ok).toBe(true);
    expect(controller.press("c1/refresh").ok).toBe(false);
    expect(run).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ name: "refresh_credit_score", input: {}, tier: "service" }),
      expect.objectContaining({ source: "human" }),
    );
    finish({ status: "rejected" });
    await vi.waitFor(() => expect(controller.read()).toContain("refresh_credit_score rejected"));
    expect(controller.read()).toContain("752");
    expect(controller.actionsAt("c1/refresh")).toContain("press");
  } finally {
    controller.dispose();
    detached.dispose();
  }
});

it("names a core near miss and enters the registry only with a complete pack", () => {
  expect(def.probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Progress" }));
  expect(createRegistry({ packs: ["money"] }).ids.includes("CreditScore")).toBe(packReady("money"));
});
