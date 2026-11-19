import { z } from "zod";
import { variantProps } from "../../props";
import type { Variants } from "../../types";
import type { Definition, WriteProbe } from "../types";

type Pair = [variant: NonNullable<WriteProbe["variant"]>, requested: string, plain: string];

const nulls = (axes: Variants) => Object.fromEntries(Object.keys(axes).map((axis) => [axis, null]));

// Probe-only schemas model the eventual wire shape without adopting axes in the real components.
export function variantFixture(
  id: string,
  purpose: string,
  variants: Variants,
  shape: z.ZodRawShape,
  example: Record<string, unknown>,
  pairs: Pair[],
  options: Pick<Definition["meta"], "items" | "writeHints"> = {},
): Definition {
  const { items } = options;
  const wireExample = { ...nulls(variants), ...example };
  const rows = items && example[items.key];
  if (items?.variants && Array.isArray(rows)) {
    const defaults = nulls(items.variants);
    wireExample[items.key] = rows.map((row: object) => ({ ...defaults, ...row }));
  }
  return {
    meta: {
      id,
      purpose,
      variants,
      group: "content",
      region: "body",
      weight: 2,
      tier: "phone",
      pick: purpose,
      realPath: "Show records held on the device.",
      ...options,
    },
    props: z.strictObject({ ...variantProps(variants), ...shape }),
    examples: [wireExample],
    fallback: () => example,
    probes: pairs.flatMap(([variant, requested, plain]): WriteProbe[] => [
      { kind: "write", expect: id, brief: requested, variant },
      { kind: "write", expect: id, brief: plain, variant: { ...variant, value: null } },
    ]),
  };
}
