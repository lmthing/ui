import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { warrantyCopy, warrantyReading } from "../copy";
import { inventoryWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-Warranties.generated";

// Core first: KeyValue/default shows static facts, not purchase records with receipt and expiry states.
export const meta = {
  id: "Warranties",
  status: "ready",
  group: "data",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Photographed receipts and purchase records are stored on the device.",
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["bought", "price"] } },
  parts: ["root", "empty"],
  items: {
    key: "items",
    parts: ["root", "thing", "shop", "bought", "price", "ends", "receipt", "status", "trail"],
  },
  states: ["filled", "empty"],
  actions: { items: { root: ["press"] } },
  read: (input, state, lang): string[] =>
    state === "filled" ? warrantyReading(input as z.output<typeof props>, lang) : [],
} as const satisfies c.Meta;

const item = z
  .strictObject({
    thing: c.text(28),
    shop: c.text(20).optional(),
    bought: c.isoDate,
    price: z.number().nonnegative().optional(),
    ends: c.isoDate.optional(),
    receipt: c.photo.optional(),
  })
  .refine(({ bought, ends }) => !ends || bought <= ends, { path: ["ends"] });
export const props = z.strictObject({ ...c.variantProps(meta.variants), items: z.array(item).min(1).max(6) });

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const type = c.thingOf(cast);
  const row = c.itemsOf(cast, 1)[0];
  return {
    items: [
      { thing: (row && c.titleOf(row, 28, type)) ?? c.placeholderTitle(0, lang), bought: "2026-01-01" },
    ],
  };
}

export const examples = [
  {
    items: [
      {
        thing: "Grow lamp",
        shop: "Garden Supply",
        bought: "2025-12-02",
        price: 45,
        ends: "2026-12-02",
        receipt: "local:1",
      },
      {
        thing: "Heat mat",
        shop: "Seed House",
        bought: "2025-08-12",
        price: 24.5,
        ends: "2026-08-12",
        receipt: "local:2",
      },
    ],
  },
  {
    items: [
      { thing: "Travel crate", bought: "2024-06-10", ends: "2026-06-10" },
      { thing: "Training lead", bought: "2026-09-08" },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Warranties");
export const probes = [
  choose(
    "Keep proof of purchase for my equipment with a photo of each receipt, and see which warranties expire soon",
  ),
  choose(
    "Show two static label-value facts about one chair: material oak and colour brown. No purchase date, receipt or expiry.",
    "KeyValue",
  ),
  write(
    "My grow lamp was bought from Garden Supply on 2025-12-02 for 45. Coverage ends 2026-12-02; receipt photo local:1.",
  ),
  {
    ...write(
      "Save my grow lamp's purchase from Garden Supply on 2025-12-02 for 45, receipt photo local:1, and coverage through 2026-12-02. Keep all of that in the record, but hide the purchase date and what I paid. Show the shop, receipt and warranty dates.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  // Use the already-expired example so the read recording survives the upcoming expiry.
  read("Open the travel crate's purchase record", { address: "w1/r1", action: "press" }, 1),
] satisfies c.Probe[];

type WarrantiesProps = c.Props<typeof props, typeof meta>;
type WarrantyRowProps = Pick<WarrantiesProps, "detail"> & { surface: c.SurfaceFinish } & {
  row: WarrantiesProps["items"][number];
  density: c.ThemeDensity;
  today: Date;
};

function WarrantyExpiry(
  { ends, status, tone }: Pick<ReturnType<typeof warrantyCopy>, "ends" | "status" | "tone">,
  separator: string,
  density: c.ThemeDensity,
) {
  return (
    <kit.KitContent group="response" density={density}>
      <kit.KitText
        part="ends"
        role="caption"
        tone={status ? "muted" : "text"}
        density={density}
        emphasis={status ? "normal" : "strong"}
      >
        {status && (
          <kit.KitText
            part="status"
            role="caption"
            tone={tone === "warn" ? tone : "text"}
            emphasis="strong"
            density={density}
          >
            {status}
          </kit.KitText>
        )}
        {status && separator}
        {ends}
      </kit.KitText>
    </kit.KitContent>
  );
}

function WarrantyRow({ row, density, surface, detail, today }: WarrantyRowProps) {
  const {
    lang,
    words: { warranties: words },
  } = kit.useWords(inventoryWordsFor);
  const { shop, bought, price, ends, status, tone } = warrantyCopy(row, detail, lang, today);
  const leading = row.receipt && (
    <kit.KitPhoto part="receipt" photo={row.receipt} label={words.receiptFor(row.thing)} />
  );
  return (
    <kit.KitRow item={row.id} part="root" role="button" label={row.thing} {...{ density, surface }}>
      <kit.KitContent density={density}>
        <kit.KitRow
          part={null}
          inline
          surface="plain"
          label={row.thing}
          lineRole="body"
          density={density}
          trailing={<kit.KitTrail part="trail" kind="chevron" />}
        >
          <kit.KitContent density={density} lead={leading} leadingAlign="row">
            <kit.KitText part="thing" role="body" density={density}>
              {row.thing}
            </kit.KitText>
            {shop && (
              <kit.KitText part="shop" role="caption" tone="muted" density={density}>
                {shop}
              </kit.KitText>
            )}
            {bought && (
              <kit.KitText part="bought" role="caption" tone="muted" density={density}>
                {bought}
              </kit.KitText>
            )}
            {price && (
              <kit.KitText
                part="price"
                role="number"
                numberScale="compact"
                tone="muted"
                emphasis="quiet"
                density={density}
              >
                {price}
              </kit.KitText>
            )}
          </kit.KitContent>
        </kit.KitRow>
        {WarrantyExpiry({ ends, status, tone }, words.separator, density)}
      </kit.KitContent>
    </kit.KitRow>
  );
}

export function Warranties(input: WarrantiesProps) {
  const state = kit.useComponentState();
  const density = kit.useKit().density;
  const surface = "card";
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  if (state === "empty")
    return (
      <kit.KitCard part="root" {...{ density, surface }}>
        <kit.KitEmpty part="empty" icon="receipt" decorativeIcon />
      </kit.KitCard>
    );
  const today = new Date();
  return (
    <kit.KitCard part="root" style="cards" density={density}>
      {input.items.map((row) => (
        <WarrantyRow key={row.id} {...{ row, density, surface, detail, today }} />
      ))}
    </kit.KitCard>
  );
}
