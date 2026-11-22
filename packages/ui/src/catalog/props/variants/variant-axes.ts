/** Shared wire vocabulary. The first value is the global default. */
export const variantAxes = {
  emphasis: { kind: "finish", values: ["quiet", "normal", "hero"] },
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
