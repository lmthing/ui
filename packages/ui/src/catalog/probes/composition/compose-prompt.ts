import type { CastLike } from "../../types";
import { defaultLines, type CoreArchetypeMeta } from "../../archetypes";
import { buildEntry, composeFlow, variantVocabulary, writerVariants } from "../../prompt";
import type { Definition } from "..";

const omitGuidance =
  "Return compact JSON. When a layout says to omit a field the schema requires, write null for it instead.";

export function composeRequest(
  meta: CoreArchetypeMeta,
  layout: string,
  cast: CastLike,
  defs: Record<string, Definition>,
  brief?: string,
) {
  const slots = meta.layouts[layout]!.slots;
  const names = [...new Set(slots.flatMap((slot) => [...slot.allow]))];
  const offersVariants = names.some((name) => defs[name]?.meta.variants || defs[name]?.meta.items?.variants);
  const toggle =
    slots.some((slot) => slot.variant === "toggle" && slot.allow.includes("List")) &&
    defs.List?.meta.variants?.trail?.includes("toggle")
      ? 'toggle means every List row has an effective trail of "toggle"; a row without a trail can inherit the List trail.'
      : "toggle means every List row has trail: toggle.";
  const before = [
    "Write one complete phone screen as JSON: {id,title?,components:[{id,c,...props}]}. Use unique snake_case ids for components; never put ids on array items. Use only listed props. Use null for absent optional fields, never write empty strings.",
    `Layout: ${meta.id}/${layout}. Job: ${meta.purpose}.`,
    ...(brief === undefined ? [] : [`Brief: ${brief}\n${omitGuidance}`]),
    `Recipe slots: ${JSON.stringify(slots)}. Match every required slot in order. Variants such as shelf, reply, month or mood are the component's style; Field/Camera variants are kind. prices means every Choice option has a price value; ${toggle}`,
    "Screen rules: three to nine components outside overlays, total weight at most twelve, at most two weight-three components. One primary Button at most. Hero first in the body; a SectionTitle needs following content. Repeated types cannot be adjacent except Card and Field. Reply Composer is last after Bubbles. Do not invent color, size or layout props.",
    ...(offersVariants
      ? [
          variantVocabulary,
          "An explicit layout rule can request an axis. Catalog examples show JSON shape, not requested styling. Never infer an axis from the data alone. Variant limits: one hero emphasis and one cover collection per screen.",
        ]
      : []),
    ...(meta.layouts[layout]!.writeHints ?? []).map((hint) => `Layout rule: ${hint}`),
    `Real app content: ${JSON.stringify(cast)}`,
  ];
  const listing = names.map((name) => `${buildEntry(defs[name]!)}\nweight: ${defs[name]!.meta.weight}`);
  const after = [
    `A valid default for this layout: ${JSON.stringify(defaultLines(meta, layout, cast, defs))}`,
    ...(offersVariants ? [writerVariants] : []),
    `Use the supplied facts, not content from examples. Do not invent dates, status, measurements, or zero values for missing data. Keep all components focused on the screen's job; give the main action a clear label and avoid duplicate or unrelated actions. ${composeFlow} Reply with JSON only.`,
  ];
  return {
    prompt: [...before, ...listing, ...after].join("\n\n"),
    localPrompt: [...before, ...after].join("\n\n"),
  };
}

export const composePrompt = (...args: Parameters<typeof composeRequest>) => composeRequest(...args).prompt;
