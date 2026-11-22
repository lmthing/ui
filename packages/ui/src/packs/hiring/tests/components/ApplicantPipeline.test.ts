import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  components,
  createRegistry,
  packReady,
  placeholderTitle,
  readComponent,
  type Props,
  type StateName,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { hasColumnTarget } from "../../../../../test/kit/column-target";
import { addressedElements } from "../../../../../test/render";
import { PipelineFixture, pipelineScreen, pipelineWithClosed } from "./ApplicantPipeline.fixture";

const { ApplicantPipeline } = components;
const { meta, props, examples, fallback, probes } = ApplicantPipeline;
const full = pipelineWithClosed();
const first = full.applicants[0]!;
const view = (input = full, state: StateName = "filled") =>
  renderToStaticMarkup(createElement(PipelineFixture, { input, state }));
const read = (input = full, state: StateName = "filled") =>
  readComponent(ApplicantPipeline, input, "p1", state).join("\n");
const screen = (state?: StateName) => pipelineScreen(full, state);
const defs = { ApplicantPipeline };
const move = (value: unknown, address = "p1/r1") => ({ address, action: "move", value });

describe("ApplicantPipeline contract", () => {
  it.each(examples)("accepts a hiring example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("keeps the bounded shape and validator-only item IDs", () => {
    expectTypeOf<Props<typeof props, typeof meta>["applicants"][number]["id"]>().toEqualTypeOf<string>();
    const limit = "x".repeat(32);
    const applicants = Array.from({ length: 20 }, (_, i) => ({
      ...first,
      name: "x".repeat(24),
      next: "x".repeat(36),
      applicationId: `${i}`.padEnd(32, "x"),
    }));
    expect(props.parse({ title: limit, jobId: limit, applicants })).toMatchObject({
      arrange: "strip",
    });
    for (const input of [
      { applicants: [] },
      { applicants: [...applicants, first] },
      { applicants: [first, first] },
      { title: "x".repeat(33) },
      { jobId: "x".repeat(33) },
      { counts: [1, 0, 0, 0] },
      { color: "red" },
      { arrange: "grid" },
    ])
      expect(props.safeParse({ ...full, ...input }).success).toBe(false);
    for (const patch of [
      { id: "r1" },
      { applicationId: "x".repeat(33) },
      { name: "x".repeat(25) },
      { next: "x".repeat(37) },
      { stage: "hired" },
      { outcome: "pending" },
      { applied: "2027-02-29" },
      { nextAt: "tomorrow" },
      { goto: "Open review" },
    ])
      expect(props.safeParse({ ...full, applicants: [{ ...first, ...patch }] }).success).toBe(false);
  });
});

describe("ApplicantPipeline fallback and probes", () => {
  it("uses cast names or localized neutral placeholders", () => {
    const things = [{ type: "record", fields: ["label"] }];
    const lang = "en-GB";
    for (const label of ["Opening title", 3, undefined]) {
      const items = label === undefined ? [] : [{ id: "one", type: "record", sample: true, label }];
      const title = typeof label === "string" ? label : placeholderTitle(0, lang);
      expect(props.parse(fallback({ cast: { things, items }, lang }))).toMatchObject({
        title,
        applicants: [{ name: title, stage: "applied", outcome: "active" }],
      });
    }
  });
  it("keeps the pack readiness gate and the model probes", () => {
    expect(createRegistry({ packs: ["hiring"] }).ids.includes(meta.id)).toBe(packReady("hiring"));
    expect(meta).toMatchObject({ weight: 3, dense: true, tier: "phone" });
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: "List" }),
        expect.objectContaining({ kind: "choose", expect: "ApplicantPipeline" }),
        expect.objectContaining({ kind: "write", variant: { axis: "arrange", value: "rows" } }),
        expect.objectContaining({ kind: "read", expect: { address: "p1/r1", action: "press" } }),
        expect.objectContaining({ kind: "read", expect: { address: "p1/r1", action: "move" } }),
      ]),
    );
  });
});

describe("ApplicantPipeline parts and states", () => {
  it("renders localized counts and keeps IDs and parts across layouts", () => {
    const addresses = ["root", "title", "stages", "applied", "screening", "interview", "offer", "outcomes"];
    addresses.push("r1/root", "r1/name", "r1/applied", "r1/next", "r1/next_at");
    addresses.push("r3/root", "r3/name", "r3/applied", "r3/next");
    for (const input of [full, { ...full, arrange: "rows" }] as const) {
      const parts = addressedElements(view(input));
      expect(new Set(parts.keys())).toEqual(new Set(addresses.map((part) => `home/p1/${part}`)));
      expect(parts.get("home/p1/applied")?.text).toEqual(["1"]);
      expect(parts.get("home/p1/screening")?.text).toEqual(["1"]);
      expect(parts.get("home/p1/interview")?.text).toEqual(["0"]);
      expect(
        parts
          .get("home/p1/outcomes")
          ?.children.map(({ text, children }) => [text.join(""), children[0]?.text]),
      ).toEqual([
        ["Hired: ", ["0"]],
        [" · Rejected: ", ["0"]],
        [" · Withdrawn: ", ["1"]],
      ]);
      const root = parts.get("home/p1/r1/root")!;
      expect(hasColumnTarget(root, "press")).toBe(true);
      expect(hasColumnTarget(root, "move")).toBe(true);
    }
    expect(read()).toContain('r1 "Sam Patel"');
    expect(read()).toContain("Screening: 1");
    expect(read()).toContain("Hired: 0 · Rejected: 0 · Withdrawn: 1");
    expect(read()).not.toContain("Riley Chen");
  });
  it.each(["loading", "empty", "error"] as const)("renders a non-actionable %s state", (state) => {
    const html = view(full, state);
    expect([...addressedElements(html).keys()]).toEqual(
      state === "loading" ? ["home/p1/root", "home/p1/stages"] : ["home/p1/root", "home/p1/title"],
    );
    if (state === "loading") expect(html).toContain('aria-label="Loading"');
    if (state === "empty") expect(html).toContain("No applicants yet");
    if (state === "error") expect(html).toContain("Couldn’t save the stage change");
    expect(html).not.toContain('data-step-action="move"');
    expect(read(full, state)).not.toContain("[p1/");
    const controller = createScreenController({ screen: screen(state), defs });
    try {
      expect(controller.act(move("interview"))).toMatchObject({ ok: false, code: "not_actionable" });
    } finally {
      controller.dispose();
    }
  });
});

describe("ApplicantPipeline read and act", () => {
  it("rejects display labels, same-stage moves, terminal rows and destructive choices", () => {
    const controller = createScreenController({ screen: screen(), defs });
    try {
      for (const value of ["Interview", "screening", "saved", "hired", "rejected", "withdrawn", 1])
        expect(controller.act(move(value))).toMatchObject({ ok: false, code: "invalid_value" });
      expect(controller.act(move("interview", "p1/r2"))).toMatchObject({
        ok: false,
        code: "not_actionable",
      });
      expect(controller.press("p1/r2").ok).toBe(false);
      expect(controller.snapshotScreen()).toEqual(screen());
    } finally {
      controller.dispose();
    }
  });
  it("projects stable moves atomically, updates counts, and still opens the same review", () => {
    const onLink = vi.fn();
    const controller = createScreenController({ screen: screen(), defs, onLink });
    try {
      expect(controller.act([move("interview"), move("interview")])).toMatchObject({ ok: false, at: 1 });
      expect(controller.act(move("offer"), { dryRun: true })).toMatchObject({ ok: true, dryRun: true });
      expect(controller.snapshotScreen()).toEqual(screen());
      expect(controller.act(move("interview"))).toMatchObject({
        ok: true,
        changed: 'p1/r1 move = "interview"',
      });
      expect(controller.read()).toContain(
        '[p1/r1 move = "interview"; choices ["applied","screening","offer"]]',
      );
      expect(controller.read()).toContain("Interview: 1");
      expect(controller.read()).toContain("Screening: 0");
      expect(controller.read()).toContain("Withdrawn: 1");
      const { id: _id, c: _c, state: _state, ...wire } = controller.snapshotScreen().components[0]!;
      const { applicants } = props.parse(wire);
      const parts = addressedElements(view({ ...full, applicants }));
      expect(parts.get("home/p1/interview")?.text).toEqual(["1"]);
      expect(parts.get("home/p1/screening")?.text).toEqual(["0"]);
      expect(applicants).toEqual([{ ...first, stage: "interview" }, ...full.applicants.slice(1)]);
      expect(controller.press("p1/r1").ok).toBe(true);
      expect(onLink).toHaveBeenCalledExactlyOnceWith("sam_review", "home/p1/r1");
      expect(controller.act(move("screening")).ok).toBe(true);
      expect(controller.snapshotScreen()).toEqual(screen());
    } finally {
      controller.dispose();
    }
  });
});
