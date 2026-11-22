import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { accountCopy, accountReading } from "../copy";
import { moneyWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-AccountCard.generated";
// prettier-ignore
export const meta = {
  id: "AccountCard",
  status: "ready",
  group: "content",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Balances typed in on the device; a bank link would need an outside service.",
  variants: { detail: ["full", "brief"], arrange: ["strip", "rows"] },
  variantParts: { "detail.brief": { hides: ["last4"] } },
  parts: ["root"],
  items: { key: "accounts", parts: ["root", "name", "kind", "last4", "balance", "swatch", "credit_limit", "rewards_value"] },
  states: ["filled", "loading"],
  actions: { items: { root: ["press"] } },
  read: (input, state, lang, _data, currency): string[] =>
    state === "filled" ? accountReading((input as z.output<typeof props>).accounts, lang, currency) : [],
} as const satisfies c.Meta;
// prettier-ignore
export const props = z.strictObject({
    ...c.variantProps(meta.variants),
    accounts: z.array(z.strictObject({
      name: c.text(20), kind: z.enum(["current", "savings", "card", "cash", "jar"]),
      last4: c.text(4).regex(/^\d{4}$/).optional(), balance: z.number(),
      creditLimit: z.number().nonnegative().optional(), rewardsValue: z.number().nonnegative().optional(),
      swatch: z.enum(c.swatchNames), goto: c.screenId,
    })).min(1).max(4),
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
const ledgeAccounts = {
  accounts: [
    { name: "Ledge supplies", kind: "jar", balance: 84, swatch: "green", goto: "supplies" },
    { name: "Everyday", kind: "current", last4: "4821", balance: 1240.5, swatch: "navy", goto: "current" },
  ],
} satisfies z.input<typeof props>;
// prettier-ignore
export const examples = [
  ledgeAccounts,
  {
    accounts: [
      { name: "Walk kit card", kind: "card", last4: "9034", balance: -120, swatch: "purple", goto: "card" },
      { name: "Trot reserve", kind: "savings", balance: 640, swatch: "blue", goto: "savings" },
    ],
  },
  { ...ledgeAccounts, detail: "brief" },
  { ...ledgeAccounts },
  { ...ledgeAccounts },
  { ...ledgeAccounts, arrange: "rows" },
  {
    arrange: "rows",
    accounts: [
      { name: "Trot expenses", kind: "card", last4: "9034", balance: -120, creditLimit: 2500, rewardsValue: 37.5, swatch: "purple", goto: "card" },
      { name: "Fuel reserve", kind: "jar", balance: 175, swatch: "blue", goto: "fuel" },
    ],
  },
] satisfies z.input<typeof props>[];
const { choose, write, read } = c.probesFor("AccountCard");
// prettier-ignore
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
  { ...write("Stack my account cards vertically, full width. Everyday current balance 400, navy, opens current. Savings balance 600, green, opens savings."), variant: { axis: "arrange", value: "rows" } },
  { ...write("My purple Everyday card has a balance of -120 and a credit limit of 2500. It opens card. Show that limit with the balance."), expectProps: { accounts: [{ creditLimit: 2500 }] } },
  { ...write("Show my purple Everyday card with a balance of -120 and rewards worth 37.50 in money. It opens card. Include the rewards value on the card."), expectProps: { accounts: [{ rewardsValue: 37.5 }] } },
  read("Open the Ledge supplies account", { address: "a1/r1", action: "press" }),
] satisfies c.Probe[];

type CardProps = c.Props<typeof props, typeof meta>;
// prettier-ignore
function AccountTile({ account, copy, loading, numberScale, finish, stacked }: {
  account: CardProps["accounts"][number];
  copy: ReturnType<typeof accountCopy>;
  loading: boolean;
  stacked: boolean;
  numberScale: "compact" | "display";
  finish: { density: c.ThemeDensity; surface: c.SurfaceFinish };
}) {
  const scope = kit.usePartContext();
  const { name, id, swatch, goto } = account;
  const { kind, suffix, balance, label, details } = copy;
  type SkeletonContent = NonNullable<Parameters<typeof kit.KitSkeleton>[0]["content"]>;
  const { density } = finish, nameRole = numberScale === "compact" ? "label" : "heading";
  const headline = <>
    <kit.KitText density={density} role={nameRole} part="name">{name}</kit.KitText>
    <kit.KitText density={density} role="number" part="balance" numberScale={numberScale} tabular lines={1}>{balance}</kit.KitText>
  </>;
  const kindLine = <kit.KitText density={density} role="caption" part="kind" tone="muted">
    {kind}{suffix && <kit.KitText density={density} role="caption" part="last4" tone="muted" tabular>{suffix}</kit.KitText>}
  </kit.KitText>;
  const detailsView = details.map(({ part, label, amount }) => (
    <kit.KitText key={part} density={density} role="caption" tone="muted" part={part}>
      {label}{" "}<kit.KitText part={null} density={density} role="number" numberScale="compact" tabular>{amount}</kit.KitText>
    </kit.KitText>
  ));
  const headingBars: SkeletonContent = [[nameRole, name], ["number", balance, "start", numberScale]];
  const detailBars: SkeletonContent = [
    ["caption", kind + (suffix ?? "")], ...details.map(({ text }): ["caption", string] => ["caption", text]),
  ];
  return (
    <kit.PartContext.Provider value={{ ...scope, item: id }}>
      <kit.KitCard padded {...finish} {...(loading ? {} : { part: "root", goto, label })}>
        {stacked ? (
          <kit.KitGrid density={density}>
            {loading ? <kit.KitSkeleton shape="figure" inset="none" {...{ density }} content={headingBars} />
              : <kit.KitContent density={density}>{headline}</kit.KitContent>}
            {loading ? <kit.KitSkeleton shape="figure" inset="none" {...{ density }} content={detailBars} />
              : <kit.KitContent density={density}>
                <kit.KitGrid fitLast density={density}>
                  {kindLine}
                  <kit.KitCard part="swatch" swatch={swatch} children={null} />
                </kit.KitGrid>
                {detailsView}
              </kit.KitContent>}
          </kit.KitGrid>
        ) : <>
          {loading ? <kit.KitSkeleton shape="figure" inset="none" {...{ density }} content={[...headingBars, ...detailBars]} />
            : <kit.KitContent density={density}>{headline}{kindLine}{detailsView}</kit.KitContent>}
          <kit.KitGrid columns={3}><kit.KitCard part="swatch" swatch={swatch} children={null} /></kit.KitGrid>
        </>}
      </kit.KitCard>
    </kit.PartContext.Provider>
  );
}
// prettier-ignore
export function AccountCard({ accounts, arrange  }: CardProps) {
  const surface = "card" as const;
  const density = kit.useKit().density;
  const finish = { density, surface };
  const loading = kit.useComponentState() === "loading";
  const { lang, words } = kit.useWords(moneyWordsFor);
  const currency = kit.useAppCurrency(), stacked = arrange === "rows";
  const cards = accounts.map((account) => ({ account, copy: accountCopy(account, lang, words, currency) }));
  const numberScale =
    (!stacked && cards.length > 1) || cards.some(({ copy }) => copy.balance.length > (stacked ? 6 : 9))
      ? "compact"
      : "display";
  const tiles = cards.map(({ account, copy }) => (
    <AccountTile key={account.id} account={account} copy={copy} {...{ loading, numberScale, finish, stacked }} />
  ));
  return (
    <kit.KitCard style={stacked ? "cards" : "plain"} part="root">
      {stacked || tiles.length === 1 ? (
        tiles
      ) : tiles.length === 2 ? (
        <kit.KitGrid>{tiles}</kit.KitGrid>
      ) : (
        <kit.KitStrip>{tiles}</kit.KitStrip>
      )}
    </kit.KitCard>
  );
}
