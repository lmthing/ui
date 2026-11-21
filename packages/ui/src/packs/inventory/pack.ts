import type { PackMeta } from "../../catalog";

export const pack = {
  id: "inventory",
  example: "Boxes tracks moving crates and their contents, borrowed tools, receipts and things to buy later.",
  probes: [
    {
      kind: "pack",
      idea: "A private home inventory for insurance: take stock of the things I own, which storage box each is in, who borrowed my tools and when each warranty ends.",
      expect: ["inventory"],
    },
    {
      kind: "pack",
      idea: "A personal catalogue of the physical cameras I own, with quantities, the shelf each camera is stored on and purchase receipts. No sales, service requests or budget tracking.",
      expect: ["inventory"],
    },
    {
      kind: "pack",
      idea: "A maker's online shop for customers to browse prints for sale, put them in a cart and track orders. No owned-asset catalogue or stock room.",
      expect: ["commerce"],
    },
    {
      kind: "choose",
      need: "Scan a barcode with the phone camera to look up a record. Only the scanner, no item list, storage browser or form.",
      expect: "Camera",
    },
  ],
} as const satisfies PackMeta;
