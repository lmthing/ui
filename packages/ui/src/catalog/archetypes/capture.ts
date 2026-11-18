import { createMeta, composeProbes } from "./recipe";
import type { ArchetypeMeta } from "./types";
export const meta = createMeta(
  "capture",
  "Take a picture or scan a code",
  {
    photo: "Header Camera:photo Note Button",
    scan: "Header Camera:scan Note Button",
  },
  {
    photo: [
      "Camera kind must be photo. Its hint is at most 48 characters; a short instruction such as Aim at the leaves is enough.",
    ],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);
