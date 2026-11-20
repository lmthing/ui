import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { accountCopy, accountReading } from "../copy";
import { moneyWordsFor } from "../lang";

export const meta = {
  id: "AccountCard",
  status: "ready",
  group: "content",
  purpose: "See each of your accounts and its balance at a glance.",
  pick: "Your separate accounts as cards, with kind, last digits and balance. Not one total (Amount), or a client's payment (PaymentStatus).",
  writeHints: [
    "When asked to hide account ending digits, use detail brief and keep last4. An account's swatch is not a surface request. Unrequested density and surface must be null, never comfortable or card.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Balances typed in on the device; a bank link would need an outside service.",
  variants: { detail: ["full", "brief"], density: ["comfortable", "compact"], surface: ["card", "outlined"] },
  variantParts: { "detail.brief": { hides: ["last4"] } },
  parts: ["root"],
  items: { key: "accounts", parts: ["root", "name", "kind", "last4", "balance", "swatch"] },
  states: ["filled", "loading"],
  actions: { items: { root: ["press"] } },
  read: (input, state, lang): string[] =>
    state === "filled" ? accountReading((input as z.output<typeof props>).accounts, lang) : [],
} as const satisfies c.Meta;
export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    accounts: z
      .array(
        z.strictObject({
          name: c.text(20),
          kind: z.enum(["current", "savings", "card", "cash", "jar"]),
          last4: c
            .text(4)
            .regex(/^\d{4}$/)
            .optional(),
          balance: z.number(),
          swatch: z.enum(c.swatchNames),
          goto: c.screenId,
        }),
      )
      .min(1)
      .max(4),
  })
  .overwrite((input) =>
    input.detail === "brief"
      ? { ...input, accounts: input.accounts.map(({ last4: _last4, ...account }) => account) }
      : input,
  );
export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const names = c
    .itemsOf(cast, 3)
    .map((item, index) => c.titleOf(item, 20, thing) || c.placeholderTitle(index, lang));
  return {
    accounts: (names.length ? names : [c.placeholderTitle(0, lang)]).map((name) => ({
      name,
      kind: "cash",
      balance: 0,
      swatch: "grey",
      goto: "details",
    })),
  };
}
// prettier-ignore
export const examples = [
  {
    accounts: [
      { name: "Ledge supplies", kind: "jar", balance: 84, swatch: "green", goto: "supplies" },
      {
        name: "Everyday",
        kind: "current",
        last4: "4821",
        balance: 1240.5,
        swatch: "navy",
        goto: "current",
      },
    ],
  },
  {
    accounts: [
      { name: "Walk kit card", kind: "card", last4: "9034", balance: -120, swatch: "purple", goto: "card" },
      { name: "Trot reserve", kind: "savings", balance: 640, swatch: "blue", goto: "savings" },
    ],
  },
  { detail: "brief", surface: "outlined", density: "compact", accounts: [
    { name: "Cash reserve", kind: "savings", last4: "1739", balance: 840, swatch: "blue", goto: "reserve" },
  ] },
] satisfies z.input<typeof props>[];
const { choose, write, read } = c.probesFor("AccountCard");
export const probes = [
  choose(
    "Show my current account, savings and credit card as separate coloured cards with each balance and last four digits",
  ),
  choose("Show my total savings as one large sum, not separate accounts", "Amount"),
  write(
    "Two accounts: Everyday current account ending 4821 with 1240.50, navy, opening current; Savings with 640, green, opening savings",
  ),
  {
    ...write(
      "Show my navy Everyday current account, balance 1240.50 ending 4821 and opening current. Keep the account kind and balance visible but hide the ending digits.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Open the Ledge supplies account", { address: "a1/r1", action: "press" }),
] satisfies c.Probe[];

type CardProps = c.Props<typeof props, typeof meta>;
function AccountTile({
  account,
  copy,
  loading,
  numberScale,
  finish,
}: {
  account: CardProps["accounts"][number];
  copy: ReturnType<typeof accountCopy>;
  loading: boolean;
  numberScale: "compact" | "display";
  finish: { density: NonNullable<CardProps["density"]>; surface: CardProps["surface"] };
}) {
  const scope = kit.usePartContext();
  const { name, id, swatch, goto } = account;
  const { kind, suffix, balance, label } = copy;
  const nameRole = numberScale === "compact" ? "label" : "heading";
  // prettier-ignore
  const marker = <kit.KitGrid columns={3}><kit.KitCard part="swatch" swatch={swatch} children={null} /></kit.KitGrid>;
  return (
    <kit.PartContext.Provider value={{ ...scope, item: id }}>
      {loading ? (
        <kit.KitCard padded {...finish}>
          <kit.KitSkeleton
            shape="figure"
            inset="none"
            content={[
              [nameRole, name],
              ["number", balance, "start", numberScale],
              ["caption", kind + (suffix ?? "")],
            ]}
          />
          {marker}
        </kit.KitCard>
      ) : (
        <kit.KitCard padded {...finish} part="root" goto={goto} label={label}>
          <kit.KitContent density={finish.density}>
            <kit.KitText density={finish.density} role={nameRole} part="name">
              {name}
            </kit.KitText>
            <kit.KitText role="number" part="balance" numberScale={numberScale} tabular lines={1}>
              {balance}
            </kit.KitText>
            <kit.KitText role="caption" part="kind" tone="muted">
              {kind}
              {suffix && (
                <kit.KitText role="caption" part="last4" tone="muted" tabular>
                  {suffix}
                </kit.KitText>
              )}
            </kit.KitText>
          </kit.KitContent>
          {marker}
        </kit.KitCard>
      )}
    </kit.PartContext.Provider>
  );
}
export function AccountCard({ accounts, density: requested, surface }: CardProps) {
  const density = kit.useVariant("density", meta.variants.density, requested);
  const finish = { density, surface };
  const loading = kit.useComponentState() === "loading";
  const { lang, words } = kit.useWords(moneyWordsFor);
  const cards = accounts.map((account) => ({ account, copy: accountCopy(account, lang, words) }));
  const numberScale =
    cards.length > 1 || cards.some(({ copy }) => copy.balance.length > 9) ? "compact" : "display";
  const tiles = cards.map(({ account, copy }) => (
    <AccountTile
      key={account.id}
      account={account}
      copy={copy}
      loading={loading}
      numberScale={numberScale}
      finish={finish}
    />
  ));
  return (
    <kit.KitCard style="plain" part="root">
      {tiles.length === 1 ? (
        tiles
      ) : tiles.length === 2 ? (
        <kit.KitGrid>{tiles}</kit.KitGrid>
      ) : (
        <kit.KitStrip>{tiles}</kit.KitStrip>
      )}
    </kit.KitCard>
  );
}
