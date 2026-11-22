import { describe, expect, it, vi } from "vitest";
import { components, createRegistry, packReady, placeholderTitle, readComponent } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";

const { Candidate } = components;
const { props, meta, examples, fallback, probes } = Candidate;
const full: ReturnType<typeof fallback> = examples[0]!;
const render = (input = full, state: "filled" | "loading" | "success" | "error" = "filled") =>
  addressedElements(
    renderInstance("Candidate", input, state, { preset: "calm", mode: "light", accent: "moss" }),
  );
const controller = (input = full, onAction = vi.fn()) =>
  createScreenController({
    screen: { id: "home", components: [{ ...input, id: "c1", c: "Candidate" }] },
    defs: { Candidate },
    onAction,
  });

describe("Candidate contract and fallback", () => {
  it.each(examples)("parses realistic examples", (example) => {
    expect(props.safeParse(example).success).toBe(true);
  });
  it("bounds review data and rejects unknown choices or presentation", () => {
    const criterion = { label: "x".repeat(32), evidence: "x".repeat(80) };
    expect(props.parse({ ...full, criteria: Array(6).fill(criterion) }).criteria[0]?.finding).toBe(
      "unreviewed",
    );
    for (const patch of [
      { name: "x".repeat(25) },
      { criteria: [] },
      { criteria: Array(7).fill(criterion) },
      { criteria: [{ ...criterion, evidence: "x".repeat(81) }] },
      { criteria: [{ ...criterion, finding: "automatic" }] },
      { criteria: [{ ...criterion, score: 9 }] },
      { surface: "plain" },
      { color: "red" },
    ])
      expect(props.safeParse({ ...full, ...patch }).success).toBe(false);
  });
  it("uses authored cast data or neutral placeholders", () => {
    const things = [{ type: "record", fields: ["first"] }];
    for (const [value, expected] of [
      ["Row name", "Row name"],
      [7, placeholderTitle(0)],
      [undefined, placeholderTitle(0)],
    ] as const) {
      const input = fallback({
        cast: {
          things,
          items: value === undefined ? [] : [{ id: "x", type: "record", sample: true, first: value }],
        },
      });
      expect(props.parse(input)).toMatchObject({ name: expected, criteria: [{ finding: "unreviewed" }] });
    }
  });
  it("retains the hiring pack gate, core near miss and behavior probes", () => {
    expect(createRegistry({ packs: ["hiring"] }).ids.includes(meta.id)).toBe(packReady("hiring"));
    expect(probes).toEqual(
      expect.arrayContaining(
        [
          { kind: "choose", expect: "Candidate" },
          { kind: "choose", expect: "Profile" },
          { kind: "write", variant: { axis: "detail", value: "brief" } },
          { kind: "read", expect: { address: "c1/reject", action: "press" } },
        ].map((probe) => expect.objectContaining(probe)),
      ),
    );
  });
});

describe("Candidate parts, states and actions", () => {
  it("compares authored interviewer findings only in panel style and respects brief detail", () => {
    const panel = examples[2]!;
    const active = render(panel).get("home/c1/r1/panel");
    expect(JSON.stringify(active)).toContain("Led the practice walk.");
    const reading = (input: typeof full) => readComponent(Candidate, input, "c1").join("\n");
    expect(reading(panel)).toContain("Jo Ellis: Meets");
    expect(reading(panel)).toContain("Ari Lane: Needs evidence");
    const brief = { ...panel, detail: "brief" } as const;
    expect(render(brief).has("home/c1/r1/panel")).toBe(true);
    expect(reading(brief)).not.toContain("Led the practice walk.");
    const defaultReview = { ...panel, style: undefined };
    expect(render(defaultReview).has("home/c1/r1/panel")).toBe(false);
    expect(reading(defaultReview)).not.toContain("Jo Ellis");
    expect(render(panel, "loading").has("home/c1/r1/panel")).toBe(false);
  });
  it("bounds panel findings without allowing numeric scores", () => {
    const entry = { interviewer: "Jo Ellis", finding: "meets" };
    for (const panelFindings of [[entry], Array(5).fill(entry), [entry, { ...entry, score: 8 }]])
      expect(props.safeParse({ ...full, criteria: [{ label: "Sample", panelFindings }] }).success).toBe(
        false,
      );
  });
  it("offers the résumé link only with its own valid destination", () => {
    const input = { ...full, resumeGoto: "sam_resume" };
    const onAction = vi.fn(),
      onLink = vi.fn();
    const current = createScreenController({
      screen: { id: "home", components: [{ ...input, id: "c1", c: "Candidate" }] },
      defs: { Candidate },
      onAction,
      onLink,
    });
    expect(render(input).has("home/c1/resume")).toBe(true);
    expect(current.read()).toContain("[c1/resume press→sam_resume]");
    expect(current.press("c1/resume").ok).toBe(true);
    expect(onLink).toHaveBeenCalledExactlyOnceWith("sam_resume", "home/c1/resume");
    expect(onAction).toHaveBeenCalledExactlyOnceWith({ address: "home/c1/resume", action: "press" });
    expect(controller().press("c1/resume").ok).toBe(false);
  });
  it("hides evidence in brief without renumbering criteria or deleting authored data", () => {
    const brief = { ...full, detail: "brief" } as const;
    const parts = [...render().keys()];
    expect(parts.some((part) => part.endsWith("/r1/evidence"))).toBe(true);
    expect([...render(brief).keys()]).toEqual(parts.filter((part) => !part.endsWith("/evidence")));
    expect(props.parse(brief).criteria[0]?.evidence).toBe(full.criteria[0]?.evidence);
    const reading = readComponent(Candidate, brief, "c1").join("\n");
    expect(reading).toContain("Group handling: Meets");
    expect(reading).not.toContain("Green Lane Rescue");
    expect(reading).not.toContain("/evidence type");
  });
  it.each(["loading", "success", "error"] as const)("does not show evidence controls in %s", (state) => {
    expect([...render(full, state).keys()].map((part) => part.split("/").at(-1))).toEqual(
      state === "loading" ? ["root", "photo"] : ["root", state],
    );
    expect(readComponent(Candidate, full, "c1", state).join("\n")).not.toContain(" press");
  });
  it("offers the two linked destinations and edits only a supplied finding", () => {
    const reading = readComponent(Candidate, full, "c1").join("\n");
    expect(reading).toContain("[c1/interview press→sam_interview]");
    expect(reading).toContain("[c1/offer press→sam_offer]");
    const current = controller();
    expect(current.act({ address: "c1/r1/finding", action: "select", value: "gap" }).ok).toBe(true);
    expect(current.act({ address: "c1/r1/finding", action: "select", value: "automatic" }).ok).toBe(false);
    expect(current.edit("c1/r1/evidence", "Observed the required task.").ok).toBe(true);
    expect(controller({ ...full, detail: "brief" }).edit("c1/r1/evidence", "Hidden").ok).toBe(false);
  });
  it.each(["hire", "reject", "withdraw"] as const)("gates %s on an active outcome", (part) => {
    const onAction = vi.fn();
    const active = controller(full, onAction);
    expect(active.press(`c1/${part}`).ok).toBe(true);
    if (part !== "hire") {
      expect(active.confirmation?.source).toBe(`home/c1/${part}`);
      expect(active.press("confirm/cancel").ok).toBe(true);
      expect(onAction).not.toHaveBeenCalled();
      expect(active.press(`c1/${part}`).ok).toBe(true);
      expect(active.press("confirm/confirm").ok).toBe(true);
    }
    expect(onAction).toHaveBeenCalledExactlyOnceWith({ address: `home/c1/${part}`, action: "press" });
    for (const outcome of ["hired", "rejected", "withdrawn"] as const) {
      const terminal = { ...full, outcome };
      expect([...render(terminal).keys()].some((address) => address.endsWith(`/${part}`))).toBe(false);
      expect(controller(terminal).press(`c1/${part}`).ok).toBe(false);
    }
  });
});
