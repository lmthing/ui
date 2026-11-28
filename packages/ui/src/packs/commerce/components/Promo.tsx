import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { offerClock, offerRemaining, promoExpiry } from "../copy";
import { commerceWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-Promo.generated";

// Core first: Banner/notice announces information, not an expiring shopping offer with a copyable discount code.
export const meta = {
  id: "Promo",
  status: "ready",
  group: "content",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "The offer is stored on the device, and its code is checked at checkout.",
  variants: {
    emphasis: ["normal", "quiet"],
    media: ["thumb", "none"],
  },
  variantParts: { "media.none": { hides: ["photo"] } },
  parts: ["root", "offer", "title", "code", "code_label", "code_icon", "ends", "photo", "countdown"],
  states: ["filled"],
  clocks: [offerClock()],
  actions: {
    parts: { root: ["press"], code: ["press"] },
    when: { code: { has_code: true } },
    noGoto: { parts: ["code"] },
  },
  read: (input, state, lang): string[] => {
    if (state !== "filled") return [];
    const data = input as z.output<typeof props> & { remainingMs?: number };
    const { ends, endsAt, code, style } = data;
    const expiry = promoExpiry(ends, lang, endsAt);
    const remaining = style === "countdown" && offerRemaining(data, lang);
    return [
      ...(remaining ? [remaining] : []),
      ...(expiry ? [expiry] : []),
      ...(code ? [commerceWordsFor(lang).copyPromoCode(code)] : []),
    ];
  },
} as const satisfies c.Meta;

export const props = z
  .strictObject({
    title: c.text(36),
    code: c.text(12).optional(),
    ends: c.isoDate.optional(),
    endsAt: c.clock.optional(),
    style: z.literal("countdown").optional(),
    photo: c.photoOrImage(["cover", "poster", "product"]).optional(),
    goto: c.screenId,
    ...c.variantProps(meta.variants),
  })
  .refine(({ style, ends }) => style !== "countdown" || ends !== undefined, { path: ["ends"] })
  .overwrite((value) => ({
    ...value,
    ...(value.media === "none" ? { photo: undefined } : {}),
    has_code: value.code !== undefined,
    has_deadline: value.style === "countdown" && value.ends !== undefined,
  }));

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const item = c.itemsOf(cast, 1)[0];
  return {
    title: (item && c.titleOf(item, 36, c.thingOf(cast, item.type))) || c.placeholderTitle(0, lang),
    goto: "detail",
  };
}

export const examples = [
  { title: "20% off fern pots", code: "FERN20", ends: "2026-11-30", photo: "lib:fern", goto: "fern_offer" },
  { title: "Save on dog leads", goto: "lead_offer" },
  {
    title: "20% off fern pots",
    code: "FERN20",
    ends: "2026-11-23",
    endsAt: "18:30",
    style: "countdown",
    goto: "fern_offer",
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Promo");
export const probes = [
  choose("Show a shop discount card with a code I can copy, the date it ends and a link to the offer"),
  choose(
    "Warn people at the top that the app is offline and changes cannot sync, with no sale or discount",
    "Banner",
  ),
  write(
    "Show 20% off fern pots, with code FERN20, a lib:fern photo and an end date of 2026-11-30. Open fern_offer.",
  ),
  {
    ...write(
      "Show 15% off reflective leads with code LEAD15 and link to lead_offer. Keep the saved photo reference local:1 on the offer but hide the thumbnail on screen.",
    ),
    variant: { axis: "media", value: "none" },
  },
  {
    ...write(
      "Show a sale on leads ending at 18:30. Link to lead_offer. Show the closing time, not a countdown.",
    ),
    expectProps: { endsAt: "18:30" },
  },
  {
    ...write("Show a sale on fern pots with a live countdown to 2029-11-30. Link to fern_offer."),
    expectProps: { style: "countdown", ends: "2029-11-30" },
  },
  read("Copy the FERN20 discount code", { address: "p1/code", action: "press" }),
] satisfies c.Probe[];

type PromoProps = c.Props<typeof props, typeof meta>;

function OfferLink({
  title,
  expiry,
  remaining,
  photo,
  goto,
  density,
  emphasis,
}: Pick<PromoProps, "title" | "photo" | "goto" | "emphasis"> & {
  expiry?: string | undefined;
  remaining?: string | undefined;
  density: c.ThemeDensity;
}) {
  const heading = (
    <kit.KitContent {...{ density, emphasis }}>
      <kit.KitText role="heading" part="title" {...{ density, emphasis }}>
        {title}
      </kit.KitText>
      {remaining && (
        <kit.KitText role="label" tone="muted" part="countdown" density={density} tabular>
          {remaining}
        </kit.KitText>
      )}
      {expiry && (
        <kit.KitText role="caption" tone="muted" part="ends" {...{ density }}>
          {expiry}
        </kit.KitText>
      )}
    </kit.KitContent>
  );
  return (
    <kit.KitRow
      part="root"
      label={title}
      lineRole="heading"
      trailing={photo ? undefined : <kit.KitIcon name="chevron_right" decorative />}
      {...{ goto, density, emphasis }}
    >
      {photo ? (
        <kit.KitGrid fitLast {...{ density }}>
          {heading}
          <kit.KitPhoto part="photo" {...{ photo }} />
        </kit.KitGrid>
      ) : (
        heading
      )}
    </kit.KitRow>
  );
}

export function Promo(input: PromoProps) {
  const { title, code, ends, endsAt, photo, goto } = input;
  const density = kit.useKit().density;
  const surface = "tinted";
  const emphasis = kit.useVariant("emphasis", meta.variants.emphasis, input.emphasis);
  const media = kit.useVariant("media", meta.variants.media, input.media);
  const { words, lang } = kit.useWords(commerceWordsFor);
  const { screen, component } = kit.usePartContext();
  kit.useControlValue(`${screen}/${component}/$offer`, 0);
  const live = kit.useLiveControls(meta, input) as { remainingMs?: number };
  const expiry = promoExpiry(ends, lang, endsAt);
  const remaining = input.style === "countdown" ? offerRemaining({ ...input, ...live }, lang) : undefined;
  const copy = code ? words.copyPromoCode(code) : undefined;
  const codeFinish =
    emphasis === "normal" && surface === "tinted"
      ? ({ tone: "text" } as const)
      : ({ surface: "plain" } as const);
  const codeTone = emphasis === "quiet" ? "muted" : "accent";
  return (
    <kit.KitCard part="offer" surface="card" padded {...{ density }}>
      <kit.KitContent {...{ density }}>
        <OfferLink
          photo={media === "thumb" ? photo : undefined}
          {...{ title, expiry, remaining, goto, density, emphasis }}
        />
        {copy && (
          <kit.KitRow
            part="code"
            role="button"
            label={copy}
            {...codeFinish}
            lineRole="label"
            trailing={<kit.KitIcon name="clipboard" scale="sm" tone={codeTone} part="code_icon" />}
            {...{ density }}
          >
            <kit.KitText role="label" tone={codeTone} part="code_label" {...{ density }}>
              {copy}
            </kit.KitText>
          </kit.KitRow>
        )}
      </kit.KitContent>
    </kit.KitCard>
  );
}
