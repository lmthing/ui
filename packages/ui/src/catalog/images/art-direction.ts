import type { ArtStyle, ThemeChoice } from "../themes";

export const styles = {
  natural_photo:
    "Observational photography: real materials, indirect daylight and believable environmental shadows. No studio sweep or illustration.",
  studio_photo:
    "Studio product photography: precise side softbox highlights, a seamless matte sweep and crisp material detail. If the subject names a setting, stage only its signature prop on the sweep; no real windows, scenery or background architecture.",
  soft_3d:
    "Soft 3D: a hand-built miniature toy with visibly thick, rounded solids, matte molded clay and gentle contact shadows. Simplify details into bold, softly inflated forms. No photographic texture, thin real surfaces or flat vector outlines.",
  flat_illustration:
    "Flat editorial illustration: clean, opaque color shapes, hard edges and no modeling, grain or cast shadows.",
  line_art:
    "Pen line art: confident dark contour strokes on an open ground. Keep outer edges heavier than interior hatching so the silhouette holds at icon size. No blocks of color, tonal washes or modeling.",
  risograph:
    "Two-ink risograph: charcoal plus the named accent are the only two inks on paper. Translate local object colors into ink density, not more inks. Use clearly printed halftones and restrained misregistration. No washes, smooth gradients or cut edges.",
  watercolor:
    "Watercolor on cold-pressed paper: transparent washes, pigment blooms and uneven wet edges with deliberate white reserves. No hard vector edges or halftones.",
  paper_cut:
    "Layered cut paper: show bold die-cut outlines and the thickness of overlapping flat cardstock pieces with crisp relief shadows and paper fibers. Use clean edges instead of soft shading. No clay volume, realistic texture or painted gradients.",
} satisfies Record<ArtStyle, string>;

export const illustratedPortrait = {
  natural_photo:
    "Use a hand-drawn editorial portrait in place of photography, with observed proportions and daylight values.",
  studio_photo:
    "Use a sharply drawn editorial portrait in place of photography, with strong silhouette and controlled studio values.",
} as const;

export const presetDirection = {
  calm: "Measured hierarchy and quiet negative space.",
  minimal: "Exclude everything not essential to the subject.",
  warm: "Tactile materials and a welcoming, lived-in atmosphere.",
  fresh: "Airy separation and crisp, open silhouettes.",
  bold: "One assertive scale contrast and a decisive silhouette.",
  playful: "One unexpected shape or proportion, never extra clutter.",
  soft: "Gentle transitions and unbroken, rounded silhouettes.",
  editorial: "An asymmetric composition with a deliberate point of emphasis.",
  paper: "A restrained, print-like composition on a tactile ground.",
  sport: "Clear directional energy without motion blur or cropped details.",
  night: "Low-key atmosphere and a strong figure-ground relationship.",
  mono: "Value-led hierarchy with little or no chroma.",
} satisfies Record<ThemeChoice["preset"], string>;

export const accentDirection = {
  moss: "moss green",
  forest: "deep forest green",
  teal: "blue-green teal",
  sky: "sky blue",
  indigo: "deep indigo",
  violet: "violet",
  rose: "dusty rose",
  coral: "warm coral",
  amber: "amber",
  sand: "warm sand",
  slate: "blue-gray slate",
  ink: "near-black ink",
} satisfies Record<ThemeChoice["accent"], string>;

export const modeDirection = {
  light: "Use a light ground that stays distinct from the motif; retain dark separation where edges matter.",
  dark: "Use a dark ground with distinct midtone or light edges; never bury the motif in the ground.",
} satisfies Record<ThemeChoice["mode"], string>;

export const densityDirection = {
  comfortable: "Include only supporting details that help identify the subject.",
  compact: "Favor the simplest recognizable silhouette; omit tiny details that disappear at small scale.",
} satisfies Record<NonNullable<ThemeChoice["density"]>, string>;
