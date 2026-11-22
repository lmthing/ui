import type { PresetMeta } from "../meta";
import type { AxisValue } from "../types";
import { component } from "./component";
import type { elevation } from "./elevation";
import { motion } from "./motion";
import type { roles } from "./roles";
import type { type as typography } from "./type";

type TextStep = keyof typeof typography;
export type SurfaceFinish = "plain" | "card" | "tinted" | "outlined";
type Tone = AxisValue<"tone">;
type Role = (typeof roles)[number];
type Border = keyof Pick<typeof component.base, "none" | "borderWidth" | "strongBorder">;
type CardSurface = { fill: Role; rule: Role | null; border: Border; elevation: keyof typeof elevation };

const identity = {
  display: "display",
  title: "title",
  heading: "heading",
  body: "body",
  label: "label",
  caption: "caption",
  number: "number",
} as const satisfies Record<TextStep, TextStep>;

const quiet = { ...identity, display: "title", title: "heading", heading: "body", body: "label" } as const;
const hero = { ...identity, title: "display", heading: "title", body: "heading", label: "body" } as const;
const strong = {
  display: "800",
  title: "800",
  heading: "700",
  body: "500",
  label: "600",
  caption: "500",
  number: "800",
} as const;

const card = { fill: "surface", rule: null, border: "none", elevation: "flat" } as const;

/** Preset kinds supply finish tokens without naming presets in the kit. */
export const variants = {
  density: {
    comfortable: {
      compact: { gap: "sm", rowPad: "sm", cardPad: "md" },
      regular: { gap: "sm", rowPad: "md", cardPad: "lg" },
      airy: { gap: "md", rowPad: "md", cardPad: "xl" },
      text: identity,
      contentGap: "sm",
      columnGap: "md",
      stripGap: "sm",
    },
    compact: {
      compact: { gap: "xs", rowPad: "xs", cardPad: "sm" },
      regular: { gap: "xs", rowPad: "sm", cardPad: "md" },
      airy: { gap: "sm", rowPad: "sm", cardPad: "lg" },
      text: { ...quiet, label: "caption" },
      contentGap: "xs",
      columnGap: "sm",
      stripGap: "xs",
    },
  },
  emphasis: {
    quiet: { text: quiet, regular: null, strong: null },
    normal: { text: identity, regular: null, strong },
    hero: { text: hero, regular: strong, strong },
  },
  surface: {
    plain: null,
    card: {
      soft: { ...card, elevation: "card" },
      solid: card,
      hairline: { ...card, rule: "line", border: "borderWidth" },
    } satisfies Record<PresetMeta["surface"], CardSurface>,
    tinted: {
      fill: { neutral: "accentSoft", good: "goodSoft", warn: "warnSoft", bad: "badSoft" },
      rule: { neutral: "accent", good: "good", warn: "warn", bad: "bad" },
      border: "borderWidth",
    } satisfies { fill: Record<Tone, Role>; rule: Record<Tone, Role>; border: Border },
    outlined: { rule: "line", border: "strongBorder" } as const,
  } satisfies Record<SurfaceFinish, unknown>,
  align: {
    start: { text: "left", content: "stretch" },
    center: { text: "center", content: "center" },
  },
  bleed: { inset: null, edge: "gutter" },
  aspect: { auto: null, square: 1, wide: component.base.wideRatio, tall: component.base.tallRatio },
  motion: {
    calm: { pulseScale: motion.pulseScale },
    lively: { pulseScale: 0.24 },
  },
} as const;

export type ContentAlign = keyof typeof variants.align;
export type ContentBleed = keyof typeof variants.bleed;
