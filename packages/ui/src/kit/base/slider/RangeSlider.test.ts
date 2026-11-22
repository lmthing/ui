import { expect, it } from "vitest";
import { components, readComponent } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { renderInstance } from "../../../../test/render";

it("validates ordered range endpoints and reports the permission tier for media fields", () => {
  const range = { label: "Length", kind: "range", min: 0, max: 10, lower: 2, upper: 7 };
  expect(components.Field.props.safeParse(range).success).toBe(true);
  expect(components.Field.props.safeParse({ ...range, lower: 8 }).success).toBe(false);
  expect(components.Field.props.safeParse({ ...range, kind: "number" }).success).toBe(false);
  expect(readComponent(components.Field, range, "f1").join(" ")).toContain("2 to 7");
  expect(readComponent(components.Field, { label: "Photo", kind: "photo" }, "f1").join(" ")).toContain(
    "[f1/field press !needs-ok]",
  );
  expect(readComponent(components.Field, { label: "Voice", kind: "voice" }, "f1").join(" ")).toContain(
    "[f1/voice start !needs-ok]",
  );
});

it("uses live endpoint bounds and does not let either thumb cross", () => {
  const range = { label: "Length", kind: "range", min: 0, max: 10, lower: 2, upper: 7 };
  const screen = { id: "home", components: [{ id: "f1", c: "Field", ...range }] };
  const controller = createScreenController({ screen, defs: { Field: components.Field } });
  const set = (part: string, value: number) =>
    controller.act({ address: `home/f1/${part}`, action: "set", value });
  expect(set("lower", 8).ok).toBe(false);
  expect(set("upper", 9).ok).toBe(true);
  expect(set("lower", 8).ok).toBe(true);
  expect(set("upper", 7).ok).toBe(false);
  const html = renderInstance("Field", range, "filled", { preset: "calm", mode: "light", accent: "moss" });
  expect(html.match(/role="slider"/g)).toHaveLength(2);
  expect(html).toContain('aria-label="Length, minimum"');
  expect(html).toContain('aria-label="Length, maximum"');
});
