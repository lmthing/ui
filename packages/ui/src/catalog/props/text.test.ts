import { expect, it } from "vitest";
import { text, icon, photo, screenId, tier } from "./index";

it("keeps text limits and metadata on the schema", () => {
  expect(text(3).parse(" hi ")).toBe("hi");
  expect(text(3).safeParse("four").success).toBe(false);
  expect(text(3).meta()).toEqual({ kind: "text", max: 3 });
});
it.each(["phone", "ok", "people", "service"])("accepts tier %s", (value) => {
  expect(tier.parse(value)).toBe(value);
});
it("rejects values outside the shared icon, tier and reference vocabulary", () => {
  expect(tier.safeParse("online").success).toBe(false);
  expect(icon.safeParse("script").success).toBe(false);
  expect(photo.safeParse("local:0").success).toBe(false);
  expect(screenId.safeParse("https://example.org").success).toBe(false);
});
