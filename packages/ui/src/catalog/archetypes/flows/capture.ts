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
      "Only describe taking a photo, not scanning a code. Header action is null. Camera takes the picture; the final Button accepts the photo and goes to photo_review, without duplicating the shutter action. Note gives one useful capture tip, not unrelated activity data. Emit compact JSON without formatting whitespace.",
    ],
    scan: [
      "This screen only scans a code. Name the subject and scan action in the Header, e.g. Scan a plant tag. Header.action is null. Camera.kind is scan; Camera.hint gives one short instruction such as Center the code in the frame, within 48 characters.",
      "Use the Note for one practical scanning tip and say the next screen lets the person check the result before adding it. The only primary Button says Review scan and goes to scan_review. Do not add a photo option, another capture button, or a guarantee that a code matches a supplied record. Emit compact JSON.",
    ],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);
