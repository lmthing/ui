import { expect, it, vi } from "vitest";
import { components, placeholderTitle } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";

const { examples, fallback, meta, probes, props } = components.BagTracker;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const example = examples[0]!;

const cast = { things: [], items: [] };
const valid = fallback({ cast });
const first = valid.bags[0]!;
const invalid: unknown[] = [
  { ...valid, unknown: "invalid" },
  { ...valid, bags: [] },
  {
    ...valid,
    bags: Array.from({ length: 5 }, () => ({
      tag: "x",
      steps: Array.from({ length: 1 }, () => ({ stage: "checked_in", done: false })),
    })),
  },
  { bags: [{ ...first, tag: "x".repeat(17) }] },
  { bags: [first, first] },
  { bags: [{ ...first, steps: [] }] },
  { bags: [{ ...first, steps: Array(7).fill(first.steps[0]) }] },
  { bags: [{ ...first, steps: [{ stage: "unknown", done: false }] }] },
  { bags: [{ ...first, steps: [{ stage: "loaded", done: true }, ...first.steps] }] },
  { bags: [{ ...first, steps: [{ ...first.steps[0], location: "x".repeat(25) }] }] },
  { bags: [{ ...first, steps: [{ ...first.steps[0], at: "x".repeat(17) }] }] },
  { ...valid, reportGoto: "Invalid destination" },
  { ...valid, detail: "not-a-choice!" },
];

it.each(examples)("accepts a real bag example", (example) => {
  expect(props.safeParse(example).success).toBe(true);
});

it.each(invalid)("rejects invalid input", (input) => {
  expect(props.safeParse(input).success).toBe(false);
});

it("validates the fallback for empty and populated casts", () => {
  expect(props.safeParse(fallback({ cast })).success).toBe(true);
  expect(valid.bags[0]?.tag).toBe(placeholderTitle(0));
  const things = [{ type: "item", fields: ["name"] }];
  const items = [{ id: "one", type: "item", name: "Sample", sample: true }];
  for (const name of ["Sample", 42]) {
    expect(
      props.safeParse(fallback({ cast: { things, items: items.map((item) => ({ ...item, name })) } }))
        .success,
    ).toBe(true);
  }
});

it("declares a service tier, the Steps near miss and both read targets", () => {
  expect(meta.tier).toBe("service");
  expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Steps" }));
  expect(probes.filter(({ kind }) => kind === "read").map((probe) => probe.expect)).toEqual([
    { address: "b1/r2", action: "select" },
    { address: "b1/report", action: "press" },
  ]);
});

it("renders timeline, compact rows and the four non-filled states with the right parts", () => {
  const render = (state: (typeof meta.states)[number], input: unknown = example) =>
    renderInstance("BagTracker", input, state, theme);
  const filled = addressedElements(render("filled"));
  for (const part of ["r1/track", "r1/scan_1", "r1/carousel", "r2/root", "report"])
    expect(filled.has(`home/c1/${part}`), [...filled.keys()].join(" ")).toBe(true);
  expect(filled.has("home/c1/r2/scan_1")).toBe(false);
  const compact = addressedElements(render("filled", { ...example, detail: "brief" }));
  expect(compact.has("home/c1/r2/latest")).toBe(true);
  expect(compact.has("home/c1/r1/scan_1")).toBe(false);
  expect(render("empty")).toContain("No checked bags linked");
  expect(render("loading")).toContain('aria-busy="true"');
  expect(render("success")).toContain("Delivered to baggage claim");
  expect(addressedElements(render("success")).has("home/c1/report")).toBe(false);
  expect(render("error")).toContain("Baggage scans are delayed");
  expect(addressedElements(render("error")).has("home/c1/report_error")).toBe(true);
});

it("selects bag scans repeatedly without writing the active tag into snapshots", () => {
  const screen = { id: "home", components: [{ ...example, c: "BagTracker", id: "b1" }] };
  const controller = createScreenController({ screen, defs: components });
  try {
    expect(controller.read()).toContain("16:50");
    expect(controller.read()).not.toContain("16:52");
    expect(controller.press("home/b1/r2").ok).toBe(true);
    expect(controller.read()).toContain("16:52");
    expect(controller.read()).not.toContain("16:50");
    expect(controller.act({ address: "home/b1/r1", action: "select", value: "NH 674206" }).ok).toBe(false);
    expect(controller.press("home/b1/r1").ok).toBe(true);
    expect(controller.read()).toContain("16:50");
    expect(controller.snapshotScreen()).toEqual(screen);
  } finally {
    controller.dispose();
  }
});

it.each(["filled", "error"] as const)("only opens a linked %s report after confirmation", (state) => {
  const onLink = vi.fn();
  const screen = { id: "home", components: [{ ...example, c: "BagTracker", id: "b1", state }] };
  const controller = createScreenController({ screen, defs: components, onLink });
  const address = `home/b1/${state === "error" ? "report_error" : "report"}`;
  try {
    expect(controller.actionsAt(address)).toEqual(["press"]);
    expect(controller.act({ address, action: "press" }).ok).toBe(true);
    expect(onLink).not.toHaveBeenCalled();
    expect(controller.act({ address: "home/confirm/confirm", action: "press" }).ok).toBe(true);
    expect(onLink).toHaveBeenCalledWith("missing_bag", address);
  } finally {
    controller.dispose();
  }
});

it("does not offer an unlinked report or host refresh; only the service receives validated tags", () => {
  const screen = {
    id: "home",
    components: [{ ...example, reportGoto: undefined, c: "BagTracker", id: "b1" }],
  };
  const withoutHost = createScreenController({ screen, defs: components });
  const run = vi.fn(() => ({ status: "accepted" as const }));
  const withHost = createScreenController({
    screen,
    defs: components,
    hostCommands: { commands: { refresh_bags: { allows: () => true, run } } },
  });
  try {
    expect(withoutHost.actionsAt("home/b1/refresh")).toEqual([]);
    expect(withHost.actionsAt("home/b1/report")).toEqual([]);
    expect(withHost.act({ address: "home/b1/refresh", action: "press" }).ok).toBe(true);
    expect(run).toHaveBeenCalledOnce();
    expect(run.mock.calls[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ input: { tags: JSON.stringify(["NH 674205", "NH 674206"]) } }),
      ]),
    );
  } finally {
    withoutHost.dispose();
    withHost.dispose();
  }
});
