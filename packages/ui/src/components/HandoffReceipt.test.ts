import { describe, expect, it, vi } from "vitest";
import type { z } from "zod";
import { components, readComponent } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../test/render";

const def = components.HandoffReceipt;
const { examples, fallback, props } = def;
const sample: z.input<typeof props> = examples[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;

describe("HandoffReceipt contract", () => {
  it.each(examples)("accepts the reference example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("uses the cast's declared subject, or a neutral placeholder, without inventing a time or link", () => {
    const empty = fallback({ cast: { things: [], items: [] } });
    const cast = {
      things: [{ type: "entry", fields: ["label"] }],
      items: [{ id: "first", type: "entry", sample: true, label: "Review report" }],
    };
    expect(props.safeParse(empty).success).toBe(true);
    expect(fallback({ cast })).toEqual({ ...empty, subject: "Review report" });
    expect(empty).not.toHaveProperty("at");
    expect(empty).not.toHaveProperty("goto");
  });
  it.each([
    { subject: " " },
    { phase: "done" },
    { fromRole: "x".repeat(25) },
    { at: "2026-11-26T10:30:00" },
    { at: "2026-02-30T10:30:00+01:00" },
    { goto: "https://example.com" },
    { linked: true },
  ])("rejects invalid or code-owned data %j", (extra) =>
    expect(props.safeParse({ ...sample, ...extra }).success).toBe(false),
  );
});

it.each([
  ["waiting", "Awaiting receipt", "Sent"],
  ["received", "Received", "Acknowledged"],
  ["returned", "Returned", "Returned"],
] as const)("draws and reads %s without implying the receiving work is complete", (phase, label, event) => {
  const input = { ...sample, phase };
  const parts = addressedElements(renderInstance("HandoffReceipt", input, "filled", theme));
  expect(parts.get("home/c1/phase")?.text).toEqual([label]);
  expect(parts.get("home/c1/phase")?.attributes).toContain('aria-live="polite"');
  expect([...parts.keys()].indexOf("home/c1/phase")).toBeLessThan(
    [...parts.keys()].indexOf("home/c1/reference"),
  );
  expect(parts.get("home/c1/reference")?.text).toEqual([sample.reference]);
  expect(parts.get("home/c1/sender")?.text).toEqual([sample.fromRole]);
  expect(parts.get("home/c1/recipient")?.text).toEqual([sample.toRole]);
  expect(parts.get("home/c1/time")?.text.join("")).toMatch(/9:30.*UTC/);
  expect(parts.get("home/c1/time")?.text.join("")).toMatch(new RegExp(`^${event} · `));
  const read = readComponent(def, input, "receipt").join("\n");
  expect(read).toContain(label);
  expect(read).toContain(`From: "${sample.fromRole}"`);
  expect(read).toContain(`To: "${sample.toRole}"`);
});

it("hides the summary in brief and offers only a link to the original record", () => {
  const brief = { ...sample, detail: "brief" };
  const parts = addressedElements(renderInstance("HandoffReceipt", brief, "filled", theme));
  expect(parts.has("home/c1/summary")).toBe(false);
  expect(parts.has("home/c1/open_label")).toBe(true);
  expect(readComponent(def, brief, "receipt").join("\n")).not.toContain(sample.summary);
  for (const goto of [sample.goto, undefined]) {
    const root = addressedElements(renderInstance("HandoffReceipt", { ...brief, goto }, "filled", theme)).get(
      "home/c1/root",
    );
    expect(root?.attributes).toContain(goto ? 'role="link"' : 'role="group"');
    expect(root?.attributes).toContain(`aria-label="${goto ? "View record: " : ""}${sample.subject}"`);
    const onLink = vi.fn();
    const runtime = createScreenController({
      screen: { id: "home", components: [{ ...brief, goto, c: "HandoffReceipt", id: "receipt" }] },
      defs: components,
      onLink,
    });
    try {
      expect(runtime.press("receipt/root").ok).toBe(goto !== undefined);
      if (goto) expect(onLink).toHaveBeenCalledWith(goto, "home/receipt");
      else expect(onLink).not.toHaveBeenCalled();
    } finally {
      runtime.dispose();
    }
  }
});
