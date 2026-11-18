import { describe, expect, it } from "vitest";
import { components } from "@lmthing/ui/catalog";
import { renderInstance } from "../../test/render";

const { examples } = components.Field;

describe("Field rendering", () => {
  const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
  it.each(examples)("draws unique parts and the actual control value", (example) => {
    const html = renderInstance("Field", example, "filled", theme);
    for (const part of ["root", "label", "field"]) {
      expect(html.match(new RegExp(`data-testid="home/c1/${part}"`, "g"))).toHaveLength(1);
    }
    const field = html.match(/<[^>]*data-testid="home\/c1\/field"[^>]*>/)?.[0];
    const role =
      { choice: "radiogroup", repeat: "radiogroup", toggle: "switch", slider: "slider", photo: "button" }[
        example.kind as "choice"
      ] ?? "textbox";
    expect(field).toContain(`role="${role}"`);
    if (["text", "number", "date", "time"].includes(example.kind) && "value" in example) {
      expect(field).toContain(`value="${example.value}"`);
    }
  });
  it.each(["-12", "0", "5.5", "25"])("preserves slider value %s instead of clamping it", (value) => {
    const html = renderInstance("Field", { kind: "slider", label: "Level", value }, "filled", theme);
    expect(html).toContain(`aria-valuenow="${value}"`);
  });
});
