import { describe, expect, it } from "vitest";
import { components, size, space } from "@lmthing/ui/catalog";
import { elementAt, renderInstance, styleAt } from "../../test/render";

const { examples } = components.Field;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;

describe("Field rendering", () => {
  it.each(examples)("draws unique parts and the actual control value", (example) => {
    const html = renderInstance("Field", example, "filled", theme);
    const controls =
      example.kind === "range"
        ? ["lower", "upper"]
        : example.kind === "voice"
          ? ["voice"]
          : example.kind === "file"
            ? ["attach"]
            : ["field"];
    for (const part of ["root", "label", ...controls]) {
      expect(html.match(new RegExp(`data-testid="home/c1/${part}"`, "g"))).toHaveLength(1);
    }
    if (example.kind === "range" || example.kind === "voice" || example.kind === "file") {
      const role = example.kind === "range" ? "slider" : "button";
      for (const part of controls)
        expect(elementAt(html, `home/c1/${part}`).attributes).toContain(`role="${role}"`);
      if (example.kind === "file") expect(html).not.toContain('role="textbox"');
      return;
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
  it("keeps controls at the outer gutter without changing other padded cards", () => {
    const html = renderInstance("Field", examples[0], "filled", theme);
    expect(styleAt(html, "home/c1/root")).toContain("padding-left:0px");
    expect(styleAt(html, "home/c1/root")).toContain("padding-right:0px");
    const card = renderInstance("Card", { title: "A title" }, "filled", theme);
    expect(styleAt(card, "home/c1/root")).toContain(`padding-left:${space.md}px`);
  });
  it("shows a real date in the date example", () => {
    const date = examples.find((example) => example.kind === "date")!;
    expect(date).toHaveProperty("value", "2026-11-19");
    expect(renderInstance("Field", date, "filled", theme)).toContain('value="2026-11-19"');
  });
  it("uses visible 44px repeat pills and 8px gaps between rows", () => {
    const html = renderInstance(
      "Field",
      examples.find((example) => example.kind === "repeat"),
      "filled",
      theme,
    );
    expect(styleAt(html, "home/c1/field")).toContain(`row-gap:${space.sm}px`);
    for (const target of elementAt(html, "home/c1/field").children) {
      expect(styleAt(html, target)).toContain(`min-height:${size.control.md}px`);
      expect(styleAt(html, target.children[0]!)).toContain(`min-height:${size.control.md}px`);
    }
  });
});

it("uses the phone keyboard and six empty code cells by default", () => {
  const phone = renderInstance("Field", { kind: "phone", label: "Phone number" }, "filled", theme);
  expect(elementAt(phone, "home/c1/field").attributes).toMatch(/inputmode="tel"/i);
  const code = renderInstance("Field", { kind: "code", label: "Code" }, "filled", theme);
  expect(code.match(/data-kit-code-cell=""/g)).toHaveLength(6);
  expect(elementAt(code, "home/c1/field").attributes).toContain('value=""');
});
