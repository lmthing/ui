import { z } from "zod";
import * as c from "../../../catalog";

// Core first: List/trail value shows a price but cannot add a reusable billable entry with its unit and tax defaults.
export const meta = {
  id: "SavedItems",
  status: "draft",
  group: "content",
  purpose: "Reuse saved billable rates with their units and tax defaults while quoting or invoicing.",
  pick: "A reusable rate card of saved billable line items with quick-add into an invoice or estimate. Not a bill for one client (Invoice), bookable services (ServiceMenu), retail stock (ProductGrid), or a simple list with values (List).",
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "The reusable billing item library is stored on the business device.",
  parts: ["root", "status"],
  items: { key: "items", parts: ["root", "title", "rate", "tax", "category", "add", "remove"] },
  states: ["filled", "empty", "loading", "success", "error"],
  actions: { items: { root: ["press"], add: ["press"], remove: ["press"] } },
  confirmParts: ["remove"],
} as const satisfies c.Meta;

const itemProps = z.strictObject({
  id: c.text(24),
  title: c.text(32),
  rate: z.number().min(0),
  unit: c.text(12).optional(),
  taxable: z.boolean().default(true),
  category: c.text(16).optional(),
});
export const props = z.strictObject({
  items: z.array(itemProps).min(1).max(12),
  style: z.enum(["list", "grouped"]).default("list"),
});
export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const item = c.itemsOf(cast, 1)[0];
  const thing = c.thingOf(cast);
  return {
    items: [
      {
        id: "rate_1",
        title: (item && c.titleOf(item, 32, thing)) || c.placeholderTitle(0, lang),
        rate: 0,
      },
    ],
  };
}

// prettier-ignore
export const examples = [
  { items: [
    { id: "watering", title: "Plant care visit", rate: 32.5, unit: "visit", category: "Care" },
    { id: "repotting", title: "Repotting", rate: 24, unit: "plant", category: "Care" },
    { id: "consultation", title: "Care consultation", rate: 0, taxable: false },
  ] },
  { style: "grouped", items: [
    { id: "park", title: "Park walk", rate: 15, unit: "walk", category: "Dog walking" },
    { id: "leash", title: "Spare leash", rate: 12, category: "Supplies" },
    { id: "river", title: "River walk", rate: 20, unit: "walk", category: "Dog walking" },
  ] },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("SavedItems");
export const probes = [
  choose(
    "Keep a library of my preset billable rates, with units and tax defaults, that I can quickly add to the next client estimate",
  ),
  choose(
    "Show my three favorite cafés as tappable name rows with their distance as a value at the right",
    "List",
  ),
  write("Save a reusable billing item called Plant care visit at 32.50 per visit. It is taxable."),
  read("Add the saved plant care visit to this invoice", { address: "s1/r1/add", action: "press" }),
] satisfies c.Probe[];
