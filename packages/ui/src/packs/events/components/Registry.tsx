import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { registryGift, registryReading } from "../copy";
import { eventsWordsFor } from "../lang";
import { seedTitles } from "../seeds";
import { prompt } from "../../../entry/prompt-Registry.generated";

// Core first: Checklist/default cannot reserve gifts across guests or show claim ownership only to hosts.
export const meta = {
  id: "Registry",
  status: "ready",
  group: "input",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 3,
  dense: true,
  tier: "people",
  realPath: "A shared app reserves each gift so two guests cannot claim the same one.",
  variants: { lead: ["thumb", "none"] },
  variantParts: { "lead.none": { hides: ["photo"] } },
  parts: ["root", "empty", "success"],
  items: {
    key: "gifts",
    parts: [
      "root",
      "title",
      "photo",
      "price",
      "where",
      "claimed",
      "by",
      "claim",
      "claim_label",
      "unclaim",
      "unclaim_label",
    ],
  },
  confirmParts: ["unclaim"],
  states: ["filled", "empty", "success"],
  actions: {
    items: { claim: ["press"], unclaim: ["press"] },
    when: { claim: { claimed: false, host: false }, unclaim: { claimed: true, host: true } },
  },
  live: { derive: hideThumbnails },
  read: (input, state, lang): string[] => registryReading(input as z.output<typeof props>, state, lang),
} as const satisfies c.Meta;

const gift = z.strictObject({
  title: c.text(28),
  photo: c.photoOrImage(["item", "product"]).optional(),
  price: z.number().nonnegative().optional(),
  where: c.text(24).optional(),
  claimed: z.boolean(),
  by: c.text(16).optional(),
});
export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    gifts: z.array(gift).min(1).max(12),
    host: z.boolean(),
  })
  .overwrite((input) => ({
    ...input,
    gifts: input.gifts.map((gift) => ({
      ...gift,
      by: input.host && gift.claimed ? gift.by : undefined,
    })),
  }));

function hideThumbnails(input: Readonly<c.Values>): c.Values {
  if (input.lead !== "none") return {};
  const { gifts } = input as z.output<typeof props>;
  return { gifts: gifts.map((gift) => ({ ...gift, photo: undefined })) };
}

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return { gifts: seedTitles(input, 28, 3).map((title) => ({ title, claimed: false })), host: false };
}

export const examples = [
  {
    gifts: [
      { title: "Linen tablecloth", photo: "lib:linen", price: 45, where: "Loom House", claimed: false },
      { title: "Blue serving bowl", photo: "lib:bowl", price: 32, claimed: true },
    ],
    host: false,
  },
  {
    gifts: [
      {
        title: "Clay platter",
        photo: "lib:platter",
        price: 60,
        where: "Clay Studio",
        claimed: true,
        by: "Imani Cole",
      },
    ],
    host: true,
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Registry");
export const probes = [
  choose(
    "Let wedding guests reserve gifts from our shared list so nobody buys the same gift; show hosts who reserved each one.",
  ),
  choose(
    "Show jobs I can tick off as I finish them, like posting invitations or ordering flowers. No gifts, prices or reservations.",
    "Checklist",
  ),
  write(
    "Show guests a wedding gift list with an unclaimed Linen tablecloth, 45 at Loom House, photo lib:linen.",
  ),
  {
    ...write(
      "Show guests the unclaimed linen tablecloth, 45, with photo lib:linen in the data but no photo thumbnails on the list.",
    ),
    variant: { axis: "lead", value: "none" },
  },
  read("Reserve the linen tablecloth as my gift.", { address: "r1/r1/claim", action: "press" }),
] satisfies c.Probe[];

type RegistryProps = c.Props<typeof props, typeof meta>;
type Finish = Pick<RegistryProps, "lead"> & { density: c.ThemeDensity };
type GiftRow = RegistryProps["gifts"][number];

function GiftContent(
  row: GiftRow,
  density: Finish["density"],
  { price, owner, status }: Pick<ReturnType<typeof registryGift>, "price" | "owner" | "status">,
) {
  const title = (
    <kit.KitText
      part="title"
      role="heading"
      tone={row.claimed ? "muted" : "text"}
      density="compact"
      emphasis="quiet"
    >
      {row.title}
    </kit.KitText>
  );
  const detail = (
    <kit.KitContent lineRole="body" density={density}>
      {price && (
        <kit.KitText
          part="price"
          role="number"
          numberScale="compact"
          tabular
          tone={row.claimed ? "muted" : "text"}
          density={density}
        >
          {price}
        </kit.KitText>
      )}
      {row.where && (
        <kit.KitText part="where" role="caption" tone="muted" density={density}>
          {row.where}
        </kit.KitText>
      )}
    </kit.KitContent>
  );
  const claimed = row.claimed && (
    <kit.KitText part="claimed" role="caption" tone="muted" density={density}>
      {status}
      {owner && (
        <kit.KitText part="by" role="caption" tone="muted" density={density}>
          {owner}
        </kit.KitText>
      )}
    </kit.KitText>
  );
  return { title, detail, claimed };
}

function RegistryGiftRow({ row, host, density, lead }: Finish & { row: GiftRow; host: boolean }) {
  const { lang } = kit.useWords(eventsWordsFor);
  const { price, owner, status, action: label } = registryGift(row, host, lang);
  const photo =
    lead === "thumb" && row.photo ? (
      <kit.KitPhoto part="photo" shape="thumb" photo={row.photo} label={row.title} />
    ) : undefined;
  const action = label && (
    <kit.KitAction part={host ? "unclaim" : "claim"} kind={host ? "danger" : "primary"} label={label} />
  );
  const { title, detail, claimed } = GiftContent(row, density, { price, owner, status });

  const details = (
    <kit.KitContent lineRole="heading" density={density}>
      {title}
      {detail}
      {claimed}
    </kit.KitContent>
  );
  return (
    <kit.KitRow
      item={row.id}
      label={row.title}
      leading={photo}
      leadingAlign="row"
      density="comfortable"
      lineRole="heading"
      mark={row.claimed ? "muted" : "none"}
    >
      {host && action ? (
        <kit.KitContent lineRole="heading" density={density}>
          {title}
          <kit.KitGrid fitLast density="compact">
            {detail}
            {action}
          </kit.KitGrid>
          {claimed}
        </kit.KitContent>
      ) : action ? (
        <kit.KitGrid fitLast density="compact">
          {details}
          {action}
        </kit.KitGrid>
      ) : (
        details
      )}
    </kit.KitRow>
  );
}

export function Registry(input: RegistryProps) {
  const state = kit.useComponentState();
  const {
    words: { registry },
  } = kit.useWords(eventsWordsFor);
  const density = kit.useKit().density;
  const surface = "card";
  const lead = kit.useVariant("lead", meta.variants.lead, input.lead);
  return (
    <kit.KitCard part="root" style="plain" {...{ density, surface }}>
      {state === "empty" ? (
        <kit.KitEmpty part="empty" icon="gift" decorativeIcon />
      ) : state === "success" ? (
        <kit.KitEmpty
          part="success"
          icon="check"
          title={input.host ? registry.released : registry.success}
          tone="good"
          decorativeIcon
        />
      ) : (
        <kit.KitGrid arrange="rows" list listRowGap="cards" density={density}>
          {input.gifts.map((row) => (
            <RegistryGiftRow key={row.id} {...{ row, density, lead }} host={input.host} />
          ))}
        </kit.KitGrid>
      )}
    </kit.KitCard>
  );
}
