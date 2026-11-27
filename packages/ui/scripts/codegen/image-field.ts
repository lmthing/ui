import { imageKind } from "../../src/catalog/images/runtime";
import { quote } from "./doc-section";
import type { Shape } from "./shape";

export function imageField(type: string): Shape | undefined {
  const match = /^photo-or-image\[([a-z_]+(?:\s*\|\s*[a-z_]+)*)\]$/.exec(type);
  if (!match) return;
  const kinds = match[1]!.split(/\s*\|\s*/).map((kind) => imageKind.parse(kind));
  if (new Set(kinds).size !== kinds.length) throw new Error("Duplicate image kind");
  return {
    schema: `photoOrImage(${quote(kinds)})`,
    seed: '"lib:item"',
    helpers: ["photoOrImage"],
  };
}
