import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { cardChannels, cardControlsCopy, cardControlsReading } from "../copy";
import { moneyWordsFor } from "../lang";

const channelSchema = z.strictObject({ online: z.boolean(), atm: z.boolean(), international: z.boolean() });
const channelControls = c.defineLocalState({
  schema: z.strictObject({ cardRef: c.text(32), channels: channelSchema }),
  events: ["online.toggle", "atm.toggle", "international.toggle"],
  initial: ({ cardRef, channels }) =>
    ({ cardRef, channels }) as {
      cardRef: string;
      channels: z.output<typeof channelSchema>;
    },
  reduce: (state, { part, value }) => {
    if (!isChannel(part)) return { error: "Unknown card channel" };
    return {
      state: {
        ...state,
        channels: { ...state.channels, [part]: typeof value === "boolean" ? value : !state.channels[part] },
      },
    };
  },
  project: ({ channels }) => ({
    channels,
    online: { on: channels.online },
    atm: { on: channels.atm },
    international: { on: channels.international },
  }),
});

function isChannel(part: string): part is (typeof cardChannels)[number] {
  return cardChannels.some((channel) => channel === part);
}
const settledActions = [
  "freeze.toggle",
  "online.toggle",
  "atm.toggle",
  "international.toggle",
  "spend_cap.set",
  "reveal.press",
] as const;

// Core first: List with toggle trails cannot manage a single issuer card's freeze, channel limits and protected details.
export const meta = {
  id: "CardControls",
  status: "ready",
  group: "input",
  purpose: "Freeze a payment card and control where and how much it can spend.",
  pick: "Freeze one payment card or control its spending channels and cap. Not ordinary app settings (List), account balances (AccountCard), or paying bills (Bills).",
  writeHints: [
    "Use a demo card reference and four trailing digits only. Never invent or ask for a card number or CVV. A spend cap needs a positive maxCap at least as large as spendCap.",
    'Use detail "brief" only when the person asks to hide the slider or reveal. A requested limit needs default full detail: output detail null. Leave density and surface null unless requested; never output surface "card" for a payment card.',
  ],
  region: "body",
  weight: 2,
  tier: "service",
  realPath: "The issuer applies card controls; revealing protected details requires host device unlock.",
  variants: { detail: ["full", "brief"], density: ["comfortable", "compact"], surface: ["card", "outlined"] },
  variantParts: { "detail.brief": { hides: ["spend_cap", "reveal"] } },
  parts: [
    "root",
    "label",
    "network",
    "last4",
    "expires",
    "freeze",
    "online",
    "atm",
    "international",
    "spend_cap",
    "reveal",
    "status",
  ],
  states: ["filled", "loading", "success", "error"],
  successActions: settledActions,
  partTiers: { reveal: "ok" },
  confirmParts: ["freeze"],
  localState: channelControls,
  live: {
    derive: (input) => ({
      capped: input.spendCap !== undefined,
      protectedDetails: Boolean(input.maskedNumber || input.cvv),
    }),
    toggles: { freeze: { prop: "frozen", initial: false } },
  },
  set: {
    spend_cap: {
      prop: "spendCap",
      min: 0,
      bounds: (_holder, { spendCap, maxCap }) =>
        typeof spendCap === "number" && typeof maxCap === "number" ? { max: maxCap } : undefined,
    },
  },
  readSuccess: true,
  read: (input, state, lang, _data, currency): string[] =>
    cardControlsReading(input as Parameters<typeof cardControlsReading>[0], state, lang, currency),
  actions: {
    parts: {
      freeze: ["toggle"],
      online: ["toggle"],
      atm: ["toggle"],
      international: ["toggle"],
      spend_cap: ["set"],
      reveal: ["press"],
    },
    when: { spend_cap: { detail: "full", capped: true }, reveal: { detail: "full", protectedDetails: true } },
    reveal: { parts: ["reveal"] },
  },
} as const satisfies c.Meta;

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    cardRef: c.text(32).meta({ read: false }),
    label: c.text(24),
    network: z.enum(["debit", "credit", "ebt", "prepaid"]),
    last4: c.text(4).regex(/^\d{4}$/),
    frozen: z.boolean().default(false),
    channels: channelSchema,
    spendCap: z.number().nonnegative().optional(),
    maxCap: z.number().positive().optional(),
    maskedNumber: c.secret(24).optional(),
    cvv: c.secret(4).optional(),
    expires: c.text(7).optional(),
  })
  .refine(({ spendCap, maxCap }) => spendCap === undefined || (maxCap !== undefined && spendCap <= maxCap), {
    path: ["spendCap"],
    message: "A spend cap requires a maxCap at least as large",
  });

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const item = c.itemsOf(cast, 1)[0];
  return {
    cardRef: "placeholder",
    label: (item && c.titleOf(item, 24, c.thingOf(cast))) || c.placeholderTitle(0, lang),
    network: "debit",
    last4: "0000",
    channels: { online: false, atm: false, international: false },
  };
}

export const examples = [
  {
    cardRef: "ledge-demo",
    label: "Ledge supplies card",
    network: "debit",
    last4: "4821",
    channels: { online: true, atm: false, international: false },
    spendCap: 95,
    maxCap: 250,
    expires: "08/29",
    maskedNumber: "•••• •••• •••• 4821",
    cvv: "DEMO",
  },
  {
    cardRef: "trot-demo",
    label: "Trot walk kit card",
    network: "prepaid",
    last4: "9034",
    frozen: true,
    channels: { online: false, atm: false, international: true },
    detail: "brief",
  },
] as const satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("CardControls");
export const probes = [
  choose("Freeze my debit card, switch off overseas purchases and cap each purchase at 95."),
  choose(
    "Show my saved notification profiles as separate rows, with a switch next to each name. Tapping the name opens that profile's settings page.",
    "List",
  ),
  {
    ...write(
      "My Ledge debit card is demo reference ledge-demo ending 4821. Allow online shopping only, with a cap of 95 and upper limit 250.",
    ),
    variant: { axis: "detail", value: null },
    expectProps: { spendCap: 95, maxCap: 250 },
  },
  {
    ...write(
      'Use "Ledge debit" as the label for the debit card with demo reference ledge-demo ending 4821. Allow only online shopping. Show just the freeze and channel switches; hide the spending slider and details unlock.',
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Freeze the Ledge supplies card.", { address: "c1/freeze", action: "toggle" }),
] satisfies c.Probe[];

type View = c.Props<typeof props, typeof meta>;
type Finish = { density: c.ThemeDensity };

function CardSwitches({ input, density }: { input: View } & Finish) {
  const {
    words: { cardControls: words },
  } = kit.useWords(moneyWordsFor);
  const disabled = kit.useComponentState() === "loading";
  const switches = [
    { part: "freeze", on: input.frozen },
    ...cardChannels.map((part) => ({
      part,
      on: input.channels[part],
    })),
  ] as const;
  return (
    <kit.KitRowGroup density={density}>
      {switches.map(({ part, on }) => (
        <kit.KitRow
          key={part}
          inset="none"
          inline
          part={null}
          density={density}
          label={words[part]}
          trailing={<kit.KitTrail kind="toggle" part={part} on={on} disabled={disabled} />}
        >
          <kit.KitLayoutText line={{ text: words[part], strong: part === "freeze" }} density={density} />
        </kit.KitRow>
      ))}
    </kit.KitRowGroup>
  );
}

function CardCap({ input, density }: { input: View } & Finish) {
  const {
    lang,
    words: { cardControls: words },
  } = kit.useWords(moneyWordsFor);
  const disabled = kit.useComponentState() === "loading";
  const currency = kit.useAppCurrency();
  const address = c.formatAddress({ ...kit.usePartContext(), part: "spend_cap" });
  const current = kit.useNumericControl(address, !disabled && input.spendCap !== undefined);
  if (input.spendCap === undefined || input.maxCap === undefined) return null;
  const amount = c.moneyLine(current?.value ?? input.spendCap, currency, undefined, lang);
  return (
    <kit.KitContent group="response" density={density}>
      <kit.KitGrid density={density}>
        <kit.KitLayoutText line={{ text: words.spendCap }} density={density} />
        <kit.KitLayoutText
          line={{ text: amount, strong: true, tabular: true }}
          align="end"
          density={density}
        />
      </kit.KitGrid>
      <kit.KitSlider
        part="spend_cap"
        label={words.spendCap}
        value={input.spendCap}
        min={0}
        max={input.maxCap}
        step={0.01}
        disabled={disabled}
      />
    </kit.KitContent>
  );
}

function CardReveal({ input, density }: { input: View } & Finish) {
  const {
    words: { cardControls: words },
  } = kit.useWords(moneyWordsFor);
  const state = kit.useComponentState();
  const { interactive, controller } = kit.useKit();
  const reveal = kit.useAuthenticatedReveal("reveal");
  if (!input.maskedNumber && !input.cvv) return null;
  const revealed = state !== "loading" && reveal === "revealed";
  const feedback =
    reveal === "pending" ? words.unlocking : reveal === "denied" ? words.denied : words.unavailable;
  return (
    <kit.KitContent density={density}>
      <kit.KitActionFooter density={density}>
        <kit.KitAction
          part="reveal"
          contentParts={{}}
          action="press"
          kind="secondary"
          label={revealed ? words.hide : words.reveal}
          disabled={state === "loading"}
        />
      </kit.KitActionFooter>
      {revealed && (
        <kit.KitMetaLine
          title={{ text: input.maskedNumber, role: "body", tabular: true }}
          meta={input.cvv ? { text: words.securityCode(input.cvv), role: "body" } : []}
          density={density}
        />
      )}
      {interactive && controller && state !== "loading" && reveal !== "masked" && !revealed && (
        <kit.KitLayoutText line={{ text: feedback, role: "meta", tone: "muted" }} density={density} />
      )}
    </kit.KitContent>
  );
}

export function CardControls(input: View) {
  const state = kit.useComponentState();
  const { screen, component } = kit.usePartContext();
  // A direct kit mount (like the gallery) does not subscribe to the whole PhoneScreen store.
  kit.useControlValue(kit.valueKey(screen, component, `$localState/${meta.id}`), undefined);
  const {
    lang,
    words: { cardControls: words },
  } = kit.useWords(moneyWordsFor);
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const live = kit.useLiveControls(meta, input) as View;
  const copy = cardControlsCopy(live, lang);
  const body = (
    <kit.KitContent density={density}>
      <kit.KitHeader
        density={density}
        title={{ text: input.label, part: "label" }}
        meta={[
          { text: copy.network, part: "network" },
          { text: copy.last4, part: "last4", tabular: true },
          { text: copy.expires, part: "expires" },
        ]}
      />
      {state !== "error" && <CardSwitches input={live} density={density} />}
      {state !== "error" && detail === "full" && <CardCap input={live} density={density} />}
      {state !== "error" && detail === "full" && <CardReveal input={input} density={density} />}
    </kit.KitContent>
  );
  return (
    <kit.KitCard part="root" surface={surface} density={density} padded>
      <kit.KitState
        part="status"
        retain
        loading={body}
        density={density}
        message={state === "success" ? words.updated : words.error}
      >
        {body}
      </kit.KitState>
    </kit.KitCard>
  );
}
