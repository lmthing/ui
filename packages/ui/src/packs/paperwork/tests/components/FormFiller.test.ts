import { components, createRegistry, packReady, placeholderTitle, type ActStep } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { describe, expect, it, vi } from "vitest";
import { addressedElements, renderInstance } from "../../../../../test/render";

const { examples, props, fallback, probes } = components.FormFiller;
const form = examples[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const accepted = () => ({ status: "accepted" as const });
const allows = () => true;
const address = (part: string) => `f1/${part}`;

function controller(
  input: object = form,
  options: Partial<Parameters<typeof createScreenController>[0]> = {},
) {
  return createScreenController({
    defs: components,
    screen: { id: "home", components: [{ id: "f1", c: "FormFiller", ...input }] },
    ...options,
  });
}

function act(view: ReturnType<typeof controller>, part: string, action: ActStep["action"], value?: unknown) {
  return view.act({ address: address(part), action, ...(value !== undefined ? { value } : {}) });
}

describe("FormFiller contract", () => {
  it.each(examples)("accepts a domain example", (input) => expect(props.safeParse(input).success).toBe(true));
  it.each([
    { ...form, fields: [] },
    { ...form, fields: Array.from({ length: 17 }, () => form.fields[0]) },
    { ...form, document: "https://example.test/form" },
    { ...form, document: `lib:${"x".repeat(117)}` },
    { ...form, title: "x".repeat(33) },
    { ...form, percent: 100 },
    ...[
      { label: "x".repeat(29) },
      { value: "x".repeat(81) },
      { kind: "check", value: "true" },
      { kind: "text", value: true },
      { kind: "number", value: "2e4" },
      { kind: "date", value: "2026-02-29" },
      { id: "r1" },
    ].map((overrides) => ({ ...form, fields: [{ ...form.fields[0], ...overrides }] })),
  ])("rejects invalid writer data", (input) => expect(props.safeParse(input).success).toBe(false));
  it("accepts all sixteen fields and keeps a neutral fallback and the Field near miss", () => {
    expect(
      props.parse({ ...form, fields: Array.from({ length: 16 }, () => form.fields[0]) }).fields,
    ).toHaveLength(16);
    const neutral = fallback({ cast: { things: [], items: [] } });
    expect(neutral.title).toBe(placeholderTitle(0));
    expect(props.safeParse(neutral).success).toBe(true);
    expect(createRegistry({ packs: ["paperwork"] }).ids.includes("FormFiller")).toBe(packReady("paperwork"));
    expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Field" }));
  });
});

describe("FormFiller visible form", () => {
  it("keeps required addresses and progress when only required fields are drawn", () => {
    const full = addressedElements(renderInstance("FormFiller", form, "filled", theme));
    const brief = addressedElements(
      renderInstance("FormFiller", { ...form, detail: "brief" }, "filled", theme),
    );
    expect(full.get("home/c1/amount")?.text).toContain("2 of 4");
    expect(brief.get("home/c1/amount")?.text).toContain("1 of 3");
    expect(full.has("home/c1/r3/field")).toBe(true);
    expect(brief.has("home/c1/r3/field")).toBe(false);
    expect(brief.get("home/c1/r4/check")?.attributes).toContain('role="checkbox"');
    expect(brief.get("home/c1/r2/field")?.attributes).toContain('role="textbox"');
  });

  it.each([
    ["empty", "No form fields loaded"],
    ["loading", 'aria-busy="true"'],
    ["success", "Filled copy saved on this device"],
    ["error", "The original hasn’t changed."],
  ] as const)("renders the %s state", (state, marker) => {
    const html = renderInstance("FormFiller", form, state, theme);
    expect(html).toContain(marker);
    expect(html).not.toContain("home/c1/save");
  });
});

it("validates live edits by kind, accepts corrected dates, and does not read private values", () => {
  const view = controller(form, {
    hostCommands: { commands: { formFillerSaveCopy: { allows, run: accepted } } },
  });
  try {
    expect(view.read()).toContain("2 of 4");
    expect(view.read()).not.toMatch(/lib:ledge_access|Mina Shaw|f1\/save press/);
    expect(act(view, "r4/field", "type", "not a checkbox").ok).toBe(false);
    expect(act(view, "r1/check", "check").ok).toBe(false);
    expect(act(view, "r1/field", "type", "x".repeat(81)).ok).toBe(false);
    expect(view.edit("f1/r2/field", "2026-02-29").ok).toBe(true);
    expect(view.read()).toContain("Correct the highlighted fields");
    expect(view.press("f1/save").ok).toBe(false);
    expect(view.edit("f1/r2/field", "2028-02-29").ok).toBe(true);
    expect(act(view, "r4/check", "check").ok).toBe(true);
    expect(view.read()).toContain("4 of 4");
    expect(view.read()).toContain("[f1/save press]");
    expect(view.read()).not.toContain("2028-02-29");
    expect(act(view, "r4/check", "check", false).ok).toBe(true);
    expect(view.read()).not.toContain("[f1/save press]");
  } finally {
    view.dispose();
  }
});

it("asks before clearing and removes all values, including optional fields hidden in brief mode", async () => {
  const run = vi.fn(accepted);
  const compact = { ...form, detail: "brief" };
  const view = controller(compact, { hostCommands: { commands: { formFillerSaveCopy: { allows, run } } } });
  try {
    expect(view.read()).not.toMatch(/Plot number|r3\/field/);
    expect(act(view, "r3/field", "type", "99").ok).toBe(false);
    expect(view.press("f1/clear").ok).toBe(true);
    expect(view.act({ address: "confirm/cancel", action: "dismiss" }).ok).toBe(true);
    expect(view.read()).toContain("1 of 3");
    expect(view.press("f1/clear").ok).toBe(true);
    expect(view.press("confirm/confirm").ok).toBe(true);
    expect(view.read()).toContain("0 of 3");
    expect(act(view, "r1/field", "type", "Sample applicant").ok).toBe(true);
    expect(act(view, "r2/field", "type", "2028-02-29").ok).toBe(true);
    expect(act(view, "r4/check", "check", true).ok).toBe(true);
    expect(view.press("f1/save").ok).toBe(true);
    await vi.waitFor(() => expect(run).toHaveBeenCalledOnce());
    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({ fields1: expect.stringContaining('["Plot number","number",null]') }),
      }),
      expect.anything(),
    );
  } finally {
    view.dispose();
  }
});

it("requires a host for preview and routes a local copy request without modifying its source template", async () => {
  const input = examples[1]!;
  const preview = vi.fn(accepted),
    save = vi.fn(accepted);
  const hostCommands = {
    commands: { formFillerPreview: { allows, run: preview }, formFillerSaveCopy: { allows, run: save } },
  };
  const local = controller(input);
  const view = controller(input, { hostCommands });
  try {
    expect(local.press("f1/preview").ok).toBe(false);
    expect(local.press("f1/save").ok).toBe(false);
    expect(view.press("f1/preview").ok).toBe(true);
    await vi.waitFor(() => expect(view.read()).toContain("formFillerPreview accepted"));
    expect(preview).toHaveBeenCalledWith(
      expect.objectContaining({ input: { document: input.document } }),
      expect.anything(),
    );
    expect(view.press("f1/save").ok).toBe(true);
    await vi.waitFor(() => expect(view.read()).toContain("formFillerSaveCopy accepted"));
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ input: expect.objectContaining({ document: input.document }) }),
      expect.anything(),
    );
    expect(view.read()).not.toContain(input.document);
  } finally {
    local.dispose();
    view.dispose();
  }
});
