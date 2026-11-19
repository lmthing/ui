import { z } from "zod";
import {
  itemsOf,
  placeholderTitle,
  probesFor,
  screenId,
  swatchNames,
  text,
  thingOf,
  titleOf,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../../../catalog";
import {
  KitCard,
  KitContent,
  KitGrid,
  KitSkeleton,
  KitStrip,
  KitText,
  PartContext,
  useComponentState,
  usePartContext,
  useWords,
} from "../../../kit";
import { accountCopy, accountReading } from "../copy";
import { moneyWordsFor } from "../lang";

// Core first: Amount/large cannot show separate account kinds, last digits and balances in a card rail.
export const meta = {
  id: "AccountCard",
  status: "ready",
  group: "content",
  purpose: "See each of your accounts and its balance at a glance.",
  pick: "Your separate accounts as cards, with kind, last digits and balance. Not one total (Amount), or a client's payment (PaymentStatus).",
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Balances typed in on the device; a bank link would need an outside service.",
  parts: ["root"],
  items: { key: "accounts", parts: ["root", "name", "kind", "last4", "balance", "swatch"] },
  states: ["filled", "loading"],
  actions: { items: { root: ["press"] } },
  read: (input, state, lang) =>
    state === "filled" ? accountReading((input as z.output<typeof props>).accounts, lang) : [],
} as const satisfies Meta;

export const props = z.strictObject({
  accounts: z
    .array(
      z.strictObject({
        name: text(20),
        kind: z.enum(["current", "savings", "card", "cash", "jar"]),
        last4: text(4)
          .regex(/^\d{4}$/)
          .optional(),
        balance: z.number(),
        swatch: z.enum(swatchNames),
        goto: screenId,
      }),
    )
    .min(1)
    .max(4),
});

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const names = itemsOf(cast, 3).map(
    (item, index) => titleOf(item, 20, thing) || placeholderTitle(index, lang),
  );
  return {
    accounts: (names.length ? names : [placeholderTitle(0, lang)]).map((name) => ({
      name,
      kind: "cash",
      balance: 0,
      swatch: "grey",
      goto: "details",
    })),
  };
}

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
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("AccountCard");
export const probes = [
  choose(
    "Show my current account, savings and credit card as separate coloured cards with each balance and last four digits",
  ),
  choose("Show my total savings as one large sum, not separate accounts", "Amount"),
  write(
    "Two accounts: Everyday current account ending 4821 with 1240.50, navy, opening current; Savings with 640, green, opening savings",
  ),
  read("Open the Ledge supplies account", { address: "a1/r1", action: "press" }),
] satisfies Probe[];

type CardProps = Props<typeof props, typeof meta>;

function AccountTile({
  account,
  copy,
  loading,
  numberScale,
}: {
  account: CardProps["accounts"][number];
  copy: ReturnType<typeof accountCopy>;
  loading: boolean;
  numberScale: "compact" | "display";
}) {
  const scope = usePartContext();
  const { name, id, swatch, goto } = account;
  const { kind, suffix, balance, label } = copy;
  const nameRole = numberScale === "compact" ? "label" : "heading";
  const marker = (
    <KitGrid columns={3}>
      <KitCard part="swatch" swatch={swatch} children={null} />
    </KitGrid>
  );
  return (
    <PartContext.Provider value={{ ...scope, item: id }}>
      {loading ? (
        <KitCard padded>
          <KitSkeleton
            shape="figure"
            inset="none"
            content={[
              [nameRole, name],
              ["number", balance, "start", numberScale],
              ["caption", kind + (suffix ?? "")],
            ]}
          />
          {marker}
        </KitCard>
      ) : (
        <KitCard padded part="root" goto={goto} label={label}>
          <KitContent>
            <KitText role={nameRole} part="name">
              {name}
            </KitText>
            <KitText role="number" part="balance" numberScale={numberScale} tabular lines={1}>
              {balance}
            </KitText>
            <KitText role="caption" part="kind" tone="muted">
              {kind}
              {suffix && (
                <KitText role="caption" part="last4" tone="muted" tabular>
                  {suffix}
                </KitText>
              )}
            </KitText>
          </KitContent>
          {marker}
        </KitCard>
      )}
    </PartContext.Provider>
  );
}

export function AccountCard({ accounts }: CardProps) {
  const loading = useComponentState() === "loading";
  const { lang, words } = useWords(moneyWordsFor);
  const cards = accounts.map((account) => ({ account, copy: accountCopy(account, lang, words) }));
  const numberScale =
    cards.length > 1 || cards.some(({ copy }) => copy.balance.length > 9) ? "compact" : "display";
  const tiles = cards.map(({ account, copy }) => (
    <AccountTile key={account.id} account={account} copy={copy} loading={loading} numberScale={numberScale} />
  ));
  return (
    <KitCard style="plain" part="root">
      {tiles.length === 1 ? (
        tiles
      ) : tiles.length === 2 ? (
        <KitGrid>{tiles}</KitGrid>
      ) : (
        <KitStrip>{tiles}</KitStrip>
      )}
    </KitCard>
  );
}
