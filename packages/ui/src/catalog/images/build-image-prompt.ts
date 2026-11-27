import { imageTemplates } from "../../entry/image-templates.generated";
import { defaultArtStyle, type ThemeChoice } from "../themes";
import {
  accentDirection,
  densityDirection,
  illustratedPortrait,
  modeDirection,
  presetDirection,
  styles,
} from "./art-direction";
import { framingDirection, imageFraming } from "./framing";
import { imageSlot, type ImageKind, type ImageSlot } from "./image-slot";

export function buildImagePrompt(slot: ImageSlot, theme: ThemeChoice): string {
  const { kind, subject } = imageSlot.parse(slot);
  const style = theme.artStyle ?? defaultArtStyle;
  const treatment =
    kind === "avatar" && (style === "natural_photo" || style === "studio_photo")
      ? illustratedPortrait[style]
      : styles[style];
  const accent =
    theme.preset === "mono"
      ? "Keep the image monochrome; any accent should be barely perceptible."
      : `Use ${accentDirection[theme.accent]} as a small recurring accent, not a wash over the subject.`;
  return [
    `Subject: ${subject}.`,
    imageTemplates[kind].prompt,
    treatment,
    presetDirection[theme.preset],
    accent,
    modeDirection[theme.mode],
    densityDirection[theme.density ?? "comfortable"],
    kind === "pattern"
      ? "Square tile, not a framed image. Motifs may cross the edges; match opposite edges exactly."
      : framingDirection[imageFraming[kind]],
  ].join("\n");
}

export function imageRejectIf(kind: ImageKind): readonly string[] {
  return imageTemplates[kind].rejectIf;
}
