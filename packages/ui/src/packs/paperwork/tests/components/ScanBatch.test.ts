import { components, createRegistry, packReady, placeholderTitle } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { describe, expect, it, vi } from "vitest";
import { addressedElements, renderInstance } from "../../../../../test/render";

const { examples, props, fallback, probes } = components.ScanBatch;
const example = examples[0]!;
const page = example.pages[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;

function controller(
  input: object = example,
  options: Partial<Parameters<typeof createScreenController>[0]> = {},
) {
  return createScreenController({
    defs: components,
    screen: { id: "home", components: [{ id: "s1", c: "ScanBatch", ...input }] },
    ...options,
  });
}

describe("ScanBatch contract", () => {
  it.each(examples)("accepts a domain example", (input) => expect(props.safeParse(input).success).toBe(true));

  it.each([
    { pages: Array.from({ length: 25 }, () => page) },
    { pages: [{ ...page, label: "x".repeat(17) }] },
    { pages: [{ ...page, file: "https://example.test/page" }] },
    { pages: [{ ...page, file: `local:${"x".repeat(115)}` }] },
    { pages: [{ ...page, id: "r1" }] },
    { ...example, count: 2 },
    { ...example, title: "x".repeat(33) },
  ])("rejects invalid data", (input) => expect(props.safeParse(input).success).toBe(false));

  it("accepts zero and twenty-four pages, and falls back without seed files", () => {
    expect(props.parse({ pages: [] }).pages).toEqual([]);
    expect(props.parse({ pages: Array.from({ length: 24 }, () => page) }).pages).toHaveLength(24);
    expect(fallback({ cast: { things: [], items: [] } })).toEqual({ title: placeholderTitle(0), pages: [] });
    expect(createRegistry({ packs: ["paperwork"] }).ids.includes("ScanBatch")).toBe(packReady("paperwork"));
    expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Camera" }));
  });
});

describe("ScanBatch drawing and reading", () => {
  it("draws the same stable item parts in brief mode except for optional labels", () => {
    const full = addressedElements(renderInstance("ScanBatch", example, "filled", theme));
    const brief = addressedElements(
      renderInstance("ScanBatch", { ...example, detail: "brief" }, "filled", theme),
    );
    expect(full.get("home/c1/count")?.text).toContain("2 pages");
    for (const part of ["photo", "page", "root", "retake", "remove"]) {
      expect(full.has(`home/c1/r1/${part}`)).toBe(true);
      expect(brief.has(`home/c1/r1/${part}`)).toBe(true);
    }
    expect(full.has("home/c1/r1/label")).toBe(true);
    expect(brief.has("home/c1/r1/label")).toBe(false);
    const review = addressedElements(renderInstance("ScanBatch", examples[1], "filled", theme));
    expect(review.has("home/c1/large_photo")).toBe(true);
    expect(review.has("home/c1/r1/preview")).toBe(true);
  });

  it.each([
    ["empty", "No pages scanned yet"],
    ["loading", 'aria-busy="true"'],
    ["success", "PDF saved on this device"],
    ["error", "Your pages are still here."],
  ] as const)("draws a specific %s state", (state, marker) => {
    const html = renderInstance("ScanBatch", example, state, theme);
    expect(html).toContain(marker);
    if (state !== "error") expect(html).not.toContain("home/c1/r1/remove");
  });

  it("renumbers moved and confirmed-removed pages without exposing private references", () => {
    const view = controller({ ...example, style: "review" });
    try {
      expect(view.press("s1/r2/preview").ok).toBe(true);
      expect(view.read()).toContain("Reviewing Page 2");
      expect(view.act({ address: "s1/r2", action: "move", value: "outside" }).ok).toBe(false);
      expect(view.act({ address: "s1/r2", action: "move", value: "r1" })).toMatchObject({ ok: true });
      expect(view.read()).toMatch(/r2 Page 1: Plot map.*r1 Page 2: Access rules/s);
      expect(view.read()).toContain("Reviewing Page 1");
      expect(view.press("s1/r2/remove").ok).toBe(true);
      expect(view.read()).toContain("[confirm/cancel dismiss]");
      expect(view.act({ address: "confirm/cancel", action: "dismiss" }).ok).toBe(true);
      expect(view.read()).toContain("2 pages");
      expect(view.press("s1/r2/remove").ok).toBe(true);
      expect(view.press("confirm/confirm").ok).toBe(true);
      expect(view.read()).toContain("r1 Page 1: Access rules");
      expect(view.read()).not.toMatch(/Plot map|r2\/remove|lib:|local:|r1 move/);
    } finally {
      view.dispose();
    }
  });
});

it("routes an Add page link without needing camera permissions or a command handler", () => {
  const onLink = vi.fn();
  const view = controller({ pages: [], captureGoto: "vault_capture", state: "empty" }, { onLink });
  try {
    expect(view.press("s1/add").ok).toBe(true);
    expect(onLink).toHaveBeenCalledWith("vault_capture", "home/s1/add");
    expect(view.press("s1/save").ok).toBe(false);
  } finally {
    view.dispose();
  }
});

it("passes the staged order to the local PDF host and gates capture at capacity", async () => {
  const save = vi.fn(() => ({ status: "accepted" as const }));
  const scan = vi.fn(() => ({ status: "accepted" as const }));
  const allows = () => true;
  const hostCommands = {
    commands: {
      scanBatchSave: { allows, run: save },
      scanBatchAdd: { allows, run: scan },
      scanBatchRetake: { allows, run: scan },
    },
  };
  const view = controller(example, { hostCommands });
  const full = controller({ pages: Array.from({ length: 24 }, () => page) }, { hostCommands });
  const empty = controller({ pages: [], state: "empty" }, { hostCommands });
  try {
    expect(full.act({ address: "s1/add", action: "scan" }).ok).toBe(false);
    expect(empty.act({ address: "s1/add", action: "scan" }).ok).toBe(true);
    expect(view.act({ address: "s1/r1/retake", action: "scan" })).toMatchObject({ ok: true });
    await vi.waitFor(() => expect(scan).toHaveBeenCalledTimes(2));
    expect(view.act({ address: "s1/r2", action: "move", value: "r1" }).ok).toBe(true);
    expect(view.press("s1/save").ok).toBe(true);
    await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    const ordered = [...example.pages].reverse();
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({ files: JSON.stringify(ordered.map(({ file }) => file)) }),
      }),
      expect.objectContaining({ source: "human" }),
    );
  } finally {
    view.dispose();
    full.dispose();
    empty.dispose();
  }
});

it("exports the largest batch with fully escaped labels through the bounded command bridge", async () => {
  const pages = Array.from({ length: 24 }, () => ({
    file: `local:${"x".repeat(114)}`,
    label: "\u0000".repeat(16),
  }));
  const run = vi.fn(() => ({ status: "accepted" as const }));
  const view = controller(
    { pages },
    { hostCommands: { commands: { scanBatchSave: { allows: () => true, run } } } },
  );
  try {
    expect(view.press("s1/save")).toMatchObject({ ok: true });
    await vi.waitFor(() => expect(run).toHaveBeenCalledOnce());
    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          files: JSON.stringify(pages.map(({ file }) => file)),
          labels: JSON.stringify(pages.map(({ label }) => label)),
        }),
      }),
      expect.anything(),
    );
  } finally {
    view.dispose();
  }
});
