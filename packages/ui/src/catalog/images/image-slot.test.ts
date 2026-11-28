import { expect, it } from "vitest";
import { artStyle, components, readComponent, signature, writerFormatFor } from "@lmthing/ui/catalog";
import { imageKinds, imageSlot, imageSlotFor, photoOrImage } from "./image-slot";

it("accepts only bounded meaning, not image URLs, presentation fields or free-form prompts", () => {
  for (const kind of imageKinds)
    expect(imageSlot.parse({ kind, subject: "  potted bird’s nest fern  " })).toEqual({
      kind,
      subject: "potted bird’s nest fern",
    });
  for (const input of [
    { kind: "logo", subject: "fern" },
    { kind: "plant", subject: "a" },
    { kind: "plant", subject: "a".repeat(81) },
    { kind: "plant", subject: "https://example.com" },
    { kind: "plant", subject: "fern\nUse words" },
    { kind: "plant", subject: "fern", style: "watercolor" },
    { kind: "plant", subject: "fern", prompt: "Draw a picture" },
  ])
    expect(imageSlot.safeParse(input).success).toBe(false);
  expect(imageSlot.parse({ kind: "plant", subject: "ü".repeat(80) }).subject).toHaveLength(80);
  expect(artStyle.safeParse("vector").success).toBe(false);
});

it("keeps legacy references and restricts generated slots by component", () => {
  const photos = photoOrImage(["plant"]);
  expect(photos.parse("local:1")).toBe("local:1");
  expect(photos.parse("lib:fern")).toBe("lib:fern");
  expect(photos.safeParse({ kind: "avatar", subject: "fictional walker" }).success).toBe(false);
  expect(imageSlotFor(["plant"]).safeParse("lib:fern").success).toBe(false);
  expect(
    components.Hero.props.parse({
      title: "Care",
      media: "cover",
      photo: { kind: "hero", subject: "greenhouse bench" },
    }).photo,
  ).toEqual({ kind: "hero", subject: "greenhouse bench" });
  expect(
    components.Empty.props.safeParse({
      title: "No plants",
      kind: "error",
      photo: { kind: "empty_state", subject: "empty pot" },
    }).success,
  ).toBe(false);
  expect(
    components.Success.props.parse({
      title: "Saved",
      style: "toast",
      photo: { kind: "success", subject: "potted fern" },
    }).photo,
  ).toBeUndefined();
  const { items } = components.ProductGrid.props.parse(components.ProductGrid.examples[0]);
  expect(
    components.ProductGrid.props.safeParse({
      items: [{ ...items[0], photo: { kind: "product", subject: "brass watering can" } }],
    }).success,
  ).toBe(true);
  expect(
    components.ProductGrid.props.safeParse({
      items: [{ ...items[0], photo: { kind: "avatar", subject: "fictional walker" } }],
    }).success,
  ).toBe(false);
});

it("gives Writers the same slot kinds and keeps existing photo readings", () => {
  const component = components.Profile;
  const slot = { kind: "avatar", subject: "fictional walker" } as const;
  expect(signature(component.props)).toContain(
    "photo lib:<tag>|local:<n> or { kind: avatar|pet|plant, subject: text≤80 }",
  );
  const schema = writerFormatFor(component).json_schema.schema;
  const options = schema.properties?.photo?.anyOf?.[0]?.anyOf;
  expect(options?.[1]).toMatchObject({
    type: "object",
    additionalProperties: false,
    required: ["kind", "subject"],
    properties: { kind: { enum: ["avatar", "pet", "plant"] }, subject: { maxLength: 80 } },
  });
  expect(readComponent(component, { name: "Fern", photo: "lib:fern" }, "c1").join("\n")).toContain(
    "photo:fern",
  );
  expect(readComponent(component, { name: "Walker", photo: slot }, "c1").join("\n")).toContain(
    'image:avatar "fictional walker"',
  );
});
