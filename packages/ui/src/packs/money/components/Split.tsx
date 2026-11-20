import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { splitBalances, splitCopy, splitReading } from "../copy";
import { moneyWordsFor } from "../lang";

export const meta = {
  id: "Split",
  status: "ready",
  group: "data",
  purpose: "Work out who owes whom after sharing expenses.",
  pick: "Shared costs, each person's balance and the payments to settle the group. Not one sum owed (Amount), personal bills (Bills), client payments (PaymentStatus), or fixed debt repayment (Loan, Payoff).",
  writeHints: [
    'For each expense write by (payer index) and split: "equal" or "shares". Both use one share per person. Never write derived totals. To hide avatars alone, use lead none, keep photos, and write density null (not comfortable).',
  ],
  region: "body",
  weight: 2,
  tier: "people",
  realPath: "Shared expense records and acknowledgement of settlements in a shared app.",
  partTiers: { settle: "people" },
  confirmParts: ["settle"],
  variants: { density: ["comfortable", "compact"], lead: ["avatar", "none"] },
  variantParts: { "lead.none": { hides: ["photo"] } },
  parts: ["root", "add", "add_label", "empty", "settled", "settlements", "balances", "expenses"],
  items: { key: "people", parts: ["root", "name", "photo", "balance", "status", "settle", "settle_label"] },
  states: ["filled", "empty", "success"],
  actions: {
    parts: { add: ["press"] },
    items: { settle: ["press"] },
    when: { settle: { owes: true } },
  },
  read: (input, state, lang): string[] =>
    state === "filled" ? splitReading(input as z.output<typeof props>, lang) : [],
} as const satisfies c.Meta;
// prettier-ignore
export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    people: z.array(z.strictObject({ name: c.text(20), photo: c.photo })).min(2).max(6),
    expenses: z.array(z.strictObject({
      title: c.text(28),
      amount: z.number().nonnegative(),
      by: z.number().int().min(0).max(5),
      split: z.enum(["equal", "shares"]),
    })).min(0).max(6),
    goto: c.screenId,
  })
  .refine(({ people, expenses }) => expenses.every(({ by }) => by >= 0 && by < people.length), {
    path: ["expenses"],
    abort: true,
    message: "Every payer must index an existing person",
  })
  .overwrite((value) => {
    const balances = splitBalances(value.people.length, value.expenses);
    return {
      ...value,
      people: value.people.map((person, index) => ({ ...person, owes: balances[index]! < 0n })),
    };
  });
export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const people = c.itemsOf(cast, 6).map((item, index) => ({
    name: c.titleOf(item, 20, thing) || c.placeholderTitle(index, lang),
    photo: "lib:people",
  }));
  while (people.length < 2)
    people.push({ name: c.placeholderTitle(people.length, lang), photo: "lib:people" });
  return { people, expenses: [], goto: "entry" };
}
// prettier-ignore
export const examples = [
  {
    people: [
      { name: "Ana", photo: "lib:people" },
      { name: "Sam", photo: "lib:people" },
    ],
    expenses: [
      { title: "Ledge potting mix", amount: 48, by: 0, split: "equal" },
      { title: "Terracotta pots", amount: 12, by: 1, split: "equal" },
    ],
    goto: "entry",
  },
  {
    people: [
      { name: "Ben", photo: "lib:people" },
      { name: "Maya", photo: "lib:people" },
      { name: "Jo", photo: "lib:people" },
    ],
    expenses: [
      { title: "Trot walk supplies", amount: 18.5, by: 0, split: "equal" },
      { title: "Fuel for park pickup", amount: 31.25, by: 1, split: "shares" },
    ],
    goto: "expense",
  },
  { lead: "none", density: "compact",
    people: [{ name: "Ana", photo: "lib:people" }, { name: "Sam", photo: "lib:people" }],
    expenses: [{ title: "Plant pots", amount: 42, by: 0, split: "equal" }], goto: "entry" },
] satisfies z.input<typeof props>[];
const { choose, write, read } = c.probesFor("Split");
export const probes = [
  choose(
    "Our flatmates log who paid each shared expense; calculate each person's balance and who should pay whom to settle up",
  ),
  choose("Show just the single amount I owe my friend, no expense group or settle-up plan", "Amount"),
  write(
    "Ana and Sam have lib:people photos. Ana paid 48 for shared plant supplies, split equally; Sam paid 12 for pots, split equally. Add expenses opens entry. Write source expenses only",
  ),
  {
    ...write(
      "Split 42 for plant pots equally between Ana and Sam. Ana paid, both people have lib:people photos, and adding expenses opens entry. Show their names and balances without avatars.",
    ),
    variant: { axis: "lead", value: "none" },
  },
  read("Add a shared expense", { address: "s1/add", action: "press" }),
  read("Record Sam's settlement with Ana", { address: "s1/r2/settle", action: "press" }),
] satisfies c.Probe[];
type SplitProps = c.Props<typeof props, typeof meta>;
type SplitCopy = ReturnType<typeof splitCopy>;
type SettlementProps = { people: SplitProps["people"]; settlements: SplitCopy["settlements"] };
function SettlementRows({ people, settlements }: SettlementProps) {
  const scope = kit.usePartContext();
  // prettier-ignore
  return settlements.map(({ from, label, action, payments }) => {
    const person = people[from]!;
    return (
      <kit.PartContext.Provider key={person.id} value={{ ...scope, item: person.id }}>
        <kit.KitContent group={from === settlements[0]!.from ? "content" : "response"}>
          {payments.map(({ to, route, amount }) => (
            <kit.KitRow key={to} label={route} inline trailing={
              <kit.KitText part={null} role="number" numberScale="compact" tabular>{amount}</kit.KitText>}>
              <kit.KitText part={null}>{route}</kit.KitText>
            </kit.KitRow>
          ))}
          <kit.KitRow label={label} inline><kit.KitAction part="settle" kind="secondary" label={action} /></kit.KitRow>
        </kit.KitContent>
      </kit.PartContext.Provider>
    );
  });
}
function LedgerRows({
  people,
  ledger,
  lead,
  density,
}: Pick<SplitProps, "people" | "lead" | "density"> & { ledger: SplitCopy }) {
  const { words } = kit.useWords(moneyWordsFor);
  const w = words.split;
  // prettier-ignore
  return <>
    <kit.KitContent group="response">
      <kit.KitText part="balances" role="label" tone="muted">{w.balances}</kit.KitText>
      {people.map(({ id, name, photo }, index) => {
        const balance = ledger.balances[index]!;
        return <kit.KitRow key={id} item={id} label={name} inset="none" leadingAlign="row" density={density}
          leading={lead === "avatar" && <kit.KitPhoto part="photo" shape="round" label={name}
            {...(photo === "lib:people" ? { initials: Array.from(name)[0]! } : { photo })} />}
          trailing={<kit.KitText part="balance" role="number" numberScale="compact" tabular tone="muted">{balance.value}</kit.KitText>}>
          <kit.KitText part="name" lines={1} density={density}>{name}</kit.KitText>
          <kit.KitText part="status" role="label" tone={balance.cents > 0n ? "good" : balance.cents < 0n ? "bad" : "muted"}>{balance.status}</kit.KitText>
        </kit.KitRow>;
      })}
    </kit.KitContent>
    {ledger.expenses.length > 0 && <kit.KitContent group="response">
      <kit.KitText part="expenses" role="label" tone="muted">{w.expenses}</kit.KitText>
      {ledger.expenses.map(({ title, paidBy, amount }, index) => (
        <kit.KitRow key={index} label={title} inline
          trailing={<kit.KitText part={null} role="number" numberScale="compact" tabular tone="muted">{amount}</kit.KitText>}>
          <kit.KitText part={null}>{title}</kit.KitText>
          <kit.KitText part={null} role="label" tone="muted">{paidBy}</kit.KitText>
        </kit.KitRow>
      ))}
    </kit.KitContent>}
  </>;
}
export function Split(input: SplitProps) {
  const state = kit.useComponentState();
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const { thing } = kit.usePartContext();
  const { lang, words } = kit.useWords(moneyWordsFor);
  const w = words.split;
  const ledger = splitCopy(input, lang);
  // prettier-ignore
  return <kit.KitCard part="root" padded density={density}>
    {state === "empty" ? <kit.KitEmpty part="empty" {...(thing ? {} : { title: w.empty })} decorativeIcon />
      : state === "success" ? <kit.KitEmpty part="settled" icon="check" tone="good" title={w.settled} decorativeIcon />
      : <>
        {input.expenses.length === 0 ? <kit.KitEmpty part="empty" title={w.empty} decorativeIcon />
          : ledger.settlements.length ? <kit.KitContent>
            <kit.KitText part="settlements" role="heading">{w.settleUp}</kit.KitText>
            <SettlementRows people={input.people} settlements={ledger.settlements} />
          </kit.KitContent> : <kit.KitText part="settled" role="heading" tone="good">{w.settled}</kit.KitText>}
        <LedgerRows people={input.people} lead={input.lead} {...{ ledger, density }} />
        <kit.KitContent group="response">
          {input.expenses.length ? <kit.KitRow part="add" label={w.add} goto={input.goto} inline>
            <kit.KitText part="add_label" role="label" tone="accent">{w.add}</kit.KitText>
          </kit.KitRow> : <kit.KitAction part="add" label={w.add} goto={input.goto} full />}
        </kit.KitContent>
      </>}
  </kit.KitCard>;
}
