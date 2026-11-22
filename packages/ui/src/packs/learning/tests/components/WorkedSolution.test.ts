import { describe, expect, it, vi } from "vitest";
import { components, createRegistry, packReady, readComponent, type StateName } from "@lmthing/ui/catalog";
import { createScreenController, type HostCommandResult } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";

const def = components.WorkedSolution;
const stepped = def.examples[0]!,
  all = def.examples[1]!,
  photo = def.examples[2]!,
  hidden = def.examples[3]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const draw = (input: unknown, state: StateName = "filled") =>
  renderInstance("WorkedSolution", input, state, theme);
const read = (input: unknown, state: StateName = "filled") =>
  readComponent(def, input, "w1", state).join("\n");
const path = (part: string) => `home/c1/${part}`;
const screen = (input: object = stepped) => ({
  id: "home",
  components: [{ ...input, c: "WorkedSolution", id: "w1" }],
});
const step = { title: "Find x", explanation: "Add 2 to both sides." };

describe("WorkedSolution wire contract", () => {
  it.each(def.examples)("parses a domain example", (example) =>
    expect(def.props.safeParse(example).success).toBe(true),
  );
  it("accepts exact text limits and ten steps", () => {
    expect(
      def.props.safeParse({
        subject: "S".repeat(20),
        problem: "P".repeat(200),
        answer: "A".repeat(80),
        steps: Array(10).fill({
          title: "T".repeat(40),
          explanation: "E".repeat(240),
          formula: "F".repeat(160),
        }),
      }).success,
    ).toBe(true);
  });
  it.each([
    { subject: "x".repeat(21) },
    { problem: "x".repeat(201) },
    { problem: "" },
    { answer: "x".repeat(81) },
    { answer: "" },
    { steps: [] },
    { steps: Array(11).fill(step) },
    ...[
      { title: "x".repeat(41) },
      { explanation: "x".repeat(241) },
      { formula: "x".repeat(161) },
      { id: "r1" },
    ].map((patch) => ({ steps: [{ ...step, ...patch }] })),
    { problemPhoto: "https://example.org/scan" },
    { tutorGoto: "Bad link" },
    { style: "compact" },
    { color: "red" },
    { revealedSteps: 10 },
  ])("rejects invalid patch %j", (patch) =>
    expect(def.props.safeParse({ ...stepped, ...patch }).success).toBe(false),
  );
  it("keeps fallback valid with usable or malformed cast fields", () => {
    for (const label of ["Revision", 17]) {
      const value = def.fallback({
        cast: { things: [], items: [{ id: "seed", type: "one", label, sample: true }] },
      });
      expect(value.problem).toBe(typeof label === "string" ? label : "Item one");
      expect(def.props.safeParse(value).success).toBe(true);
    }
  });
  it("keeps the core near miss, variant gate and service tier", () => {
    expect(def.meta.partTiers).toEqual({ solve: "service" });
    expect("confirmParts" in def.meta).toBe(false);
    expect(def.probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Steps" }));
    expect(def.probes).toContainEqual(expect.objectContaining({ variant: { axis: "media", value: "none" } }));
    expect(createRegistry({ packs: ["learning"] }).ids.includes("WorkedSolution")).toBe(
      packReady("learning"),
    );
  });
});

describe("WorkedSolution parts and states", () => {
  it("exposes only the visible problem, step and exact formula", () => {
    const nodes = addressedElements(draw(stepped));
    for (const part of [
      "problem",
      "subject",
      "progress",
      "r1/root",
      "r1/title",
      "r1/explanation",
      "r1/formula",
      "r1/copy",
      "next",
      "all",
      "tutor",
    ])
      expect(nodes.has(path(part)), part).toBe(true);
    for (const part of ["r2/root", "answer", "copy", "solve"])
      expect(nodes.has(path(part)), part).toBe(false);
    expect(read(stepped)).toContain("60 ÷ 2 = 30 mL per cup");
    expect(read(stepped)).not.toContain("150 mL");
    expect(read(stepped)).not.toContain("[w1/solve");
  });
  it("shows the completed steps and answer both ways and hides only the photo for media none", () => {
    for (const state of ["filled", "success"] as const) {
      const nodes = addressedElements(draw(all, state));
      for (const part of ["r1/root", "r2/root", "answer", "copy"])
        expect(nodes.has(path(part)), part).toBe(true);
      expect(nodes.has(path("next"))).toBe(false);
      expect(nodes.has(path("r1/copy"))).toBe(false);
      expect(read(all, state)).toContain("[w1/copy copy]");
    }
    expect(addressedElements(draw(photo)).has(path("photo"))).toBe(true);
    expect(read(photo)).toContain("photo:plants");
    expect(addressedElements(draw(hidden)).has(path("photo"))).toBe(false);
    expect(read(hidden)).not.toContain("photo:plants");
  });
  it("renders appropriate empty, loading and error states without active actions", () => {
    expect(draw(stepped, "empty")).toContain("No problem to solve yet");
    expect(draw(stepped, "error")).toContain("This problem could not be read.");
    expect(draw(stepped, "loading")).toContain('aria-busy="true"');
    for (const state of ["empty", "error", "loading"] as const) {
      const nodes = addressedElements(draw(stepped, state));
      for (const part of ["next", "all", "tutor", "r1/copy", "copy"])
        expect(nodes.has(path(part)), part).toBe(false);
      expect(read(stepped, state)).not.toMatch(/\[w1\//);
    }
  });
});

it("reveals one step then all, copies exact bound strings, and opens the optional tutor", () => {
  const writeClipboard = vi.fn(),
    onLink = vi.fn();
  const controller = createScreenController({ screen: screen(), defs: components, writeClipboard, onLink });
  try {
    controller.registerCopyTarget("home/w1/r1/copy", stepped.steps[0]!.formula!);
    controller.registerCopyTarget("home/w1/r2/copy", stepped.steps[1]!.formula!);
    controller.registerCopyTarget("home/w1/copy", stepped.answer);
    expect(controller.press("w1/r1/copy").ok).toBe(true);
    expect(controller.press("w1/r2/copy").ok).toBe(false);
    expect(controller.press("w1/copy").ok).toBe(false);
    expect(controller.press("w1/next").ok).toBe(true);
    expect(controller.read()).toContain("Step 2 of 3");
    expect(controller.read()).not.toContain("Check the units");
    expect(controller.press("w1/r2/copy").ok).toBe(true);
    expect(controller.press("w1/all").ok).toBe(true);
    expect(controller.read()).toContain("All steps revealed");
    expect(controller.press("w1/all").ok).toBe(false);
    expect(controller.press("w1/next").ok).toBe(false);
    expect(controller.press("w1/copy").ok).toBe(true);
    expect(writeClipboard.mock.calls.flat()).toEqual(["60 ÷ 2 = 30 mL per cup", "30 × 5 = 150 mL", "150 mL"]);
    expect(controller.press("w1/tutor").ok).toBe(true);
    expect(onLink).toHaveBeenCalledWith("ratio_help", expect.any(String));
  } finally {
    controller.dispose();
  }
});

it("offers a service solver only with the host, suppresses repeat requests while pending, and retains local reveal", async () => {
  let finish!: (result: HostCommandResult) => void;
  const run = vi.fn(
    (_request: unknown) =>
      new Promise<HostCommandResult>((resolve) => {
        finish = resolve;
      }),
  );
  const controller = createScreenController({
    screen: screen(hidden),
    defs: components,
    hostCommands: { commands: { solveProblem: { allows: () => true, run } } },
  });
  const local = createScreenController({ screen: screen(all), defs: components });
  try {
    expect(local.press("w1/solve").ok).toBe(false);
    expect(local.press("w1/tutor").ok).toBe(false);
    expect(controller.read()).toContain("[w1/solve press !needs-service]");
    expect(controller.press("w1/solve").ok).toBe(true);
    expect(run).toHaveBeenCalledOnce();
    expect(run.mock.calls[0]?.[0]).toMatchObject({
      input: { problem: stepped.problem, subject: "Ratios", photo: "lib:plants" },
    });
    expect(controller.press("w1/solve").ok).toBe(false);
    expect(controller.press("w1/next").ok).toBe(false);
    finish({ status: "rejected" });
    await Promise.resolve();
    expect(controller.hostOperations("w1")).toMatchObject([{ name: "solveProblem", status: "rejected" }]);
    expect(controller.press("w1/next").ok).toBe(true);
    expect(controller.read()).toContain("Step 2 of 3");
    expect(controller.press("w1/solve").ok).toBe(true);
  } finally {
    controller.dispose();
    local.dispose();
  }
});
