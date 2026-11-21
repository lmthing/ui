import { z } from "zod";
import * as c from "../../../catalog";
import { seedTitles } from "../seeds";

// Core first: Camera/scan cannot reconcile arrivals or manually check in a named guest.
export const meta = {
  id: "Door",
  status: "draft",
  group: "action",
  purpose: "Admit people by scanning tickets or finding names, and track arrivals.",
  pick: "Admission at an event entrance: scan tickets to check people in, look up a guest for manual check-in and see arrivals. Not a standalone photo or code capture (Camera), a guest's own pass (Ticket) or pre-event replies (GuestList).",
  writeHints: [
    "Write only the instruction hint. Expected arrivals, scans and search results are host data, not props.",
  ],
  region: "body",
  weight: 2,
  tier: "ok",
  realPath: "The camera scans codes with permission; multiple doors need a shared app.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"] },
  parts: ["root", "hint", "scan", "arrivals", "recent", "search", "feedback"],
  items: { key: "results", parts: ["root", "name", "checkin"] },
  states: ["filled", "success", "error"],
  actions: { parts: { scan: ["scan"], search: ["type"] }, items: { checkin: ["press"] } },
  live: { text: { search: { prop: "search", max: 40 } } },
  successActions: ["scan.scan", "search.type"],
} as const satisfies c.Meta;

export const props = z.strictObject({ ...c.variantProps(meta.variants), hint: c.text(40) });

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return { hint: seedTitles(input, 40, 1)[0]! };
}

export const examples = [
  { hint: "Scan a Harbour Benefit pass" },
  { hint: "Scan or find a reunion guest", density: "compact", surface: "outlined" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Door");
export const probes = [
  choose(
    "At the gala entrance scan admission codes to check people in, show arrivals against tickets sold and let me find a guest by name for manual check-in.",
  ),
  choose(
    "Let me point my phone at the decorations and take a new picture. No tickets, guest list or check-in.",
    "Camera",
  ),
  write("Set up check-in for a benefit gala, with the instruction 'Scan a Harbour Benefit pass'."),
  read("Scan the next guest's ticket at the entrance.", { address: "d1/scan", action: "scan" }),
] satisfies c.Probe[];
