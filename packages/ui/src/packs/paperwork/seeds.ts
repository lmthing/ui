import { z } from "zod";
import {
  clip,
  detailOf,
  itemsOf,
  placeholderTitle,
  thingOf,
  titleOf,
  wordsFor,
  type FallbackInput,
} from "../../catalog";

// Keep the private reference out of the generic reader's text and photo fields.
export const attachment = z
  .string()
  .max(120)
  .regex(/^(?:local|lib):[a-zA-Z0-9_-]+$/)
  .meta({ kind: "private_file" });

export const privateFile = "(private file)";
export const privateMark = "(private mark)";
export const seedDate = "2026-11-20";
export const seedFile = "lib:placeholder";

export function seedRows({ cast, lang }: FallbackInput, titleMax: number, detailMax: number) {
  const thing = thingOf(cast);
  const items = itemsOf(cast, 3);
  return (items.length ? items : [undefined]).map((item, index) => ({
    title: (item && titleOf(item, titleMax, thing)) ?? clip(placeholderTitle(index, lang), titleMax),
    detail: (item && detailOf(item, detailMax, thing)) ?? clip(wordsFor(lang).placeholderDetail, detailMax),
  }));
}
