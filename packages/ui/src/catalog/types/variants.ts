/** Shared wire vocabulary. The first value is the global default. */
export const variantAxes = {
  density: { kind: "finish", values: ["comfortable", "compact"] },
  emphasis: { kind: "finish", values: ["quiet", "normal", "hero"] },
  surface: { kind: "finish", values: ["plain", "card", "tinted", "outlined"] },
  align: { kind: "finish", values: ["start", "center"] },
  bleed: { kind: "finish", values: ["inset", "edge"] },
  aspect: { kind: "finish", values: ["auto", "square", "wide", "tall"] },
  detail: { kind: "content", values: ["full", "brief"] },
  media: { kind: "content", values: ["none", "icon", "thumb", "cover"] },
  figures: { kind: "content", values: ["exact", "short"] },
  labels: { kind: "content", values: ["key", "none", "all"] },
  arrange: { kind: "collection", values: ["rows", "grid", "strip"] },
  group: { kind: "collection", values: ["none", "sections", "dates"] },
  overflow: { kind: "collection", values: ["all", "peek", "page"] },
  lead: { kind: "collection", values: ["none", "icon", "avatar", "thumb", "number", "check"] },
  trail: { kind: "collection", values: ["none", "chevron", "value", "badge", "toggle", "check"] },
  tone: { kind: "item", values: ["neutral", "good", "warn", "bad"] },
  mark: { kind: "item", values: ["none", "highlight", "muted", "new"] },
} as const;

export type Axis = keyof typeof variantAxes;
export type AxisValue<A extends Axis> = (typeof variantAxes)[A]["values"][number];
export type Variants = { readonly [A in Axis]?: readonly [AxisValue<A>, ...AxisValue<A>[]] };
type ItemAxis = "tone" | "mark" | "trail";
export type ItemVariants = Pick<Variants, ItemAxis>;
export type VariantParts = Readonly<
  Partial<
    Record<
      { [A in Axis]: `${A}.${AxisValue<A>}` }[Axis],
      {
        adds?: readonly string[];
        hides?: readonly string[];
      }
    >
  >
>;
