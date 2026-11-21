import type { PackMeta } from "../../catalog";

export const pack = {
  id: "paperwork",
  example: "Trot keeps private insurance, renewal deadlines, signed forms and tax evidence on Alex's phone.",
  probes: [
    {
      kind: "pack",
      idea: "A private household filing cabinet for IDs and certificates with local scans and insurance notice dates.",
      expect: ["paperwork"],
    },
    {
      kind: "pack",
      idea: "An on-device folder for my personal administrative forms that I review and sign by drawing on them.",
      expect: ["paperwork"],
    },
    {
      kind: "pack",
      idea: "Track my current account balances, spending budgets and bills to pay. I do not keep proof files or forms.",
      expect: ["money"],
    },
    {
      kind: "choose",
      need: "Use the phone camera right now to scan a piece of paper. Just the camera capture, no register.",
      expect: "Camera",
    },
  ],
} as const satisfies PackMeta;
