import { createMeta, composeProbes } from "../recipe";
import type { ArchetypeMeta } from "../recipe";
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
      "Only describe taking a photo, not scanning a code. Name the subject and action in Header.title. Use Header.sub to explain the transition, e.g. “Take a photo, then review it.” Header action and axes are null. Camera provides the shutter and its hint names only the framing instruction. Note tells the person what to do after capture: Use photo opens review before adding it. Note axes are null. The final Button says Use photo and goes to photo_review. Emit compact JSON.",
    ],
    scan: [
      "This screen only scans a code. Name the subject and scan action in the Header, e.g. Scan a plant tag. Header.action is null. Camera.kind is scan; Camera.hint gives one short instruction such as Center the code in the frame, within 48 characters.",
      "Use the Note for one practical scanning tip and say the next screen lets the person check the result before adding it. The only primary Button says Review scan and goes to scan_review. Do not add a photo option, another capture button, or a guarantee that a code matches a supplied record. Emit compact JSON.",
    ],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);
