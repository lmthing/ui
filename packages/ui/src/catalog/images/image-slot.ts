import { z } from "zod";
import { photo, text } from "../props";

export const imageKinds = [
  "app_icon",
  "hero",
  "cover",
  "onboarding",
  "pattern",
  "empty_state",
  "success",
  "badge",
  "error",
  "product",
  "dish",
  "plant",
  "pet",
  "place",
  "room",
  "item",
  "media_cover",
  "poster",
  "step_illustration",
  "avatar",
] as const;

export const imageKind = z.enum(imageKinds);
export type ImageKind = z.infer<typeof imageKind>;

export const imageSubject = text(80)
  .min(2)
  .refine((value) => /^[\p{L}\p{N}][\p{L}\p{M}\p{N} ’'–&-]*$/u.test(value), {
    message: "Use one plain noun phrase, not a sentence, URL or prompt",
  })
  .meta({ kind: "text", max: 80 });

export function imageSlotFor<const K extends readonly [ImageKind, ...ImageKind[]]>(kinds: K) {
  return z.strictObject({ kind: z.enum(kinds), subject: imageSubject }).meta({ kind: "image_slot" });
}

export const imageSlot = imageSlotFor(imageKinds);
export type ImageSlot = z.infer<typeof imageSlot>;
export type PhotoInput = string | ImageSlot;
export type ImageResolver = (address: string, slot: ImageSlot) => string | undefined;

/** A supplied reference stays a reference; only explicit slots request generation. */
export function photoOrImage<const K extends readonly [ImageKind, ...ImageKind[]]>(kinds: K) {
  return z.union([photo, imageSlotFor(kinds)]).meta({ kind: "photo_or_image" });
}

export const subjectKinds = [
  "product",
  "dish",
  "plant",
  "pet",
  "place",
  "room",
  "item",
  "media_cover",
  "poster",
] as const;

export function photoVisible(value: unknown, resolve?: (reference: string) => string | undefined) {
  return typeof value === "string" ? Boolean(resolve?.(value)) : imageSlot.safeParse(value).success;
}
