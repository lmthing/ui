import { z } from "zod";

export const artStyles = [
  "natural_photo",
  "studio_photo",
  "soft_3d",
  "flat_illustration",
  "line_art",
  "risograph",
  "watercolor",
  "paper_cut",
] as const;

export const artStyle = z.enum(artStyles);
export type ArtStyle = z.infer<typeof artStyle>;
export const defaultArtStyle: ArtStyle = "natural_photo";
