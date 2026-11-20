import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { vendorAmounts, vendorCopy, vendorReading } from "../copy";
import { eventsWordsFor } from "../lang";
import { seedTitles } from "../seeds";

// Core first: List/cards cannot compute outstanding costs or offer supplier-specific call controls.
const roles = ["venue", "food", "photo", "music", "flowers", "cake", "transport", "other"] as const;
const vendorIcons = {
  venue: "building",
  food: "utensils",
  photo: "camera",
  music: "music",
  flowers: "flower",
  cake: "gift",
  transport: "truck",
  other: "briefcase",
} as const satisfies Record<(typeof roles)[number], c.IconName>;
const amount = z.number().nonnegative().max(999_999_999.99);
export const meta = {
  id: "Vendors",
  status: "ready",
  group: "data",
  purpose: "Keep track of event suppliers, bookings, payments and what is still owed.",
  pick: "Suppliers for one event with roles, bookings, amounts agreed and paid, due dates and phone calls. Not a general directory (List), the business's own clients (ClientCard) or personal bills (Bills).",
  writeHints: [
    "Use numeric cost and paid without currency; paid cannot exceed cost. Do not write totals.",
    'Set density and surface to null unless explicitly requested. Never write "comfortable" or "card" as defaults.',
    'To hide due dates only, use {"detail":"brief","density":null,"surface":null} and keep supplied dates in due. Otherwise leave detail null.',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Supplier records are stored on the device; calls use the supplier's phone number.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["due"] } },
  parts: ["root", "totals", "empty"],
  // prettier-ignore
  items: {
    key: "vendors",
    parts: ["root", "supplier", "role", "name", "cost", "paid", "balance", "due", "booked", "call", "call_icon"],
  },
  partTiers: { call: "service" },
  states: ["filled", "empty"],
  emptyActions: [],
  actions: { items: { root: ["press"], call: ["press"] }, when: { call: { canCall: true } } },
  read: (input, state, lang): string[] => {
    if (state !== "filled") return [];
    const { vendors, detail } = input as z.output<typeof props>;
    return vendorReading(vendors, detail, lang);
  },
} as const satisfies c.Meta;

const vendor = z
  .strictObject({
    role: z.enum(roles),
    name: c.text(24),
    cost: amount,
    paid: amount,
    due: c.isoDate.optional(),
    booked: z.boolean(),
    phone: c.text(20).meta({ kind: "phone" }).optional(),
  })
  .refine(({ cost, paid }) => paid <= cost, { path: ["paid"], message: "Paid cannot exceed cost" });

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    vendors: z.array(vendor).min(1).max(6),
  })
  .overwrite((input) => ({
    ...input,
    vendors: input.vendors.map((vendor) => ({ ...vendor, canCall: vendor.phone !== undefined })),
  }));

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return {
    vendors: seedTitles(input, 24, 3).map((name) => ({
      name,
      role: "other",
      cost: 0,
      paid: 0,
      booked: false,
    })),
  };
}

export const examples = [
  {
    vendors: [
      {
        role: "food",
        name: "Juniper Kitchen",
        cost: 2400,
        paid: 1200,
        due: "2027-05-30",
        booked: true,
        phone: "01632 960123",
      },
      { role: "music", name: "The May Quartet", cost: 900, paid: 0, booked: false },
    ],
  },
  {
    vendors: [{ role: "venue", name: "Harbour Hall", cost: 1500, paid: 1500, booked: true }],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Vendors");
export const probes = [
  choose(
    "For my wedding keep track of each supplier, whether they're booked, the agreed cost, what's been paid, and the due date for the balance.",
  ),
  choose(
    "List several venues to browse, each with a short description and a link to its own details. No supplier payments or bookings.",
    "List",
  ),
  write(
    "Add Juniper Kitchen, a booked caterer, agreed cost 2400 with 1200 paid, balance due 2027-05-30, phone 01632 960123.",
  ),
  {
    ...write(
      "Track Juniper Kitchen, booked for catering at 2400 with 1200 paid. Keep its balance due date of 2027-05-30 in the record, but hide due dates on the screen.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Call Juniper Kitchen.", { address: "v1/r1/call", action: "press" }),
] satisfies c.Probe[];

type VendorsProps = c.Props<typeof props, typeof meta>;
type VendorRow = VendorsProps["vendors"][number];
type Finish = { density: c.ThemeDensity; surface: VendorsProps["surface"] };
type AmountFigure = ReturnType<typeof vendorAmounts>[number];

// prettier-ignore
function PaymentFigure({ label, value, part, density, focal = false }: {
  label: string; value: string; part: string | null; density: c.ThemeDensity; focal?: boolean;
}) {
  return <kit.KitContent density={density}>
    <kit.KitText part={null} role="caption" tone="muted">{label}</kit.KitText>
    <kit.KitText part={part} role="number" numberScale={focal ? "display" : "compact"} tabular
      tone={focal ? "accent" : "text"} density={density}>{value}</kit.KitText>
  </kit.KitContent>;
}

// prettier-ignore
function VendorTotals({ totals: [balance, ...other], density, surface }: Finish & {
  totals: readonly [AmountFigure, ...AmountFigure[]];
}) {
  return <kit.KitCard part="totals" {...{ density, surface }} padded>
    <PaymentFigure {...balance} part={null} density={density} focal />
    <kit.KitContent group="response" density={density}>
      <kit.KitGrid columns={2} density={density}>
        {other.map((figure) => <PaymentFigure key={figure.part} {...figure} part={null} density={density} />)}
      </kit.KitGrid>
    </kit.KitContent>
  </kit.KitCard>;
}

// prettier-ignore
function Supplier({ row, detail, density, surface }: Finish & { row: VendorRow; detail: VendorsProps["detail"] }) {
  const { lang } = kit.useWords(eventsWordsFor);
  const scope = kit.usePartContext();
  const { booked, due, call } = vendorCopy(row, detail, lang);
  return <kit.PartScope {...scope} item={row.id}>
    <kit.KitCard part="supplier" {...{ density, surface }} padded>
      <kit.KitGrid fitLast density={density}>
        <kit.KitRow part="root" role="button" label={row.name} density={density} inline lineRole="body"
          leading={<kit.KitIcon part="role" name={vendorIcons[row.role]} />}
          trailing={<kit.KitIcon name="chevron_right" scale="sm" decorative />}>
          <kit.KitText part="name" role="body" density={density}>{row.name}</kit.KitText>
          <kit.KitText part="booked" role="caption" tone="muted">{booked}</kit.KitText>
        </kit.KitRow>
        {call && <kit.KitAction part="call" kind="secondary" icon="phone" a11y={call} />}
      </kit.KitGrid>
      <kit.KitGrid columns={3} density={density}>
        {vendorAmounts([row], false, lang).map((figure) => <PaymentFigure key={figure.part} {...figure} density={density} />)}
      </kit.KitGrid>
      {due && <kit.KitText part="due" role="caption" tone="muted">{due}</kit.KitText>}
    </kit.KitCard>
  </kit.PartScope>;
}

// prettier-ignore
export function Vendors(input: VendorsProps) {
  const state = kit.useComponentState();
  const { lang } = kit.useWords(eventsWordsFor);
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  if (state === "empty") return <kit.KitCard part="root" {...{ density, surface }}>
    <kit.KitEmpty part="empty" icon="briefcase" decorativeIcon />
  </kit.KitCard>;
  return <kit.KitCard part="root" style="cards" density={density}>
    <VendorTotals totals={vendorAmounts(input.vendors, true, lang)} {...{ density, surface }} />
    <kit.KitGrid arrange="rows" list listRowGap="cards" density={density}>
      {input.vendors.map((row) => <Supplier key={row.id} {...{ row, detail, density, surface }} />)}
    </kit.KitGrid>
  </kit.KitCard>;
}
