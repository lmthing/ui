import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { loanDates, loanReading, loanToday } from "../copy";
import { inventoryWordsFor } from "../lang";

// Core first: List with style "cards" cannot record lending direction, due dates, returns and reminders.
export const meta = {
  id: "Loans",
  status: "ready",
  group: "data",
  purpose: "See who has borrowed your things and when to return theirs.",
  pick: "Physical things lent to or borrowed from people, with due-back dates, returns or reminders. Not a plain directory (List), debts (Split), or booked time (Appointment).",
  writeHints: [
    "Use lent for my item with someone else and borrowed for someone else's item with me. YYYY-MM-DD dates only; never write overdue.",
    'Use detail "brief" only when asked to hide the dates loans started; still write since. Otherwise leave all unrequested axes null.',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Loan records live on the device; reminders need a messaging service.",
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["since"] } },
  parts: ["root", "empty"],
  items: {
    key: "loans",
    parts: [
      "root",
      "thing",
      "photo",
      "person",
      "way",
      "since",
      "due",
      "overdue",
      "returned",
      "returned_label",
      "remind",
      "remind_label",
    ],
  },
  partTiers: { remind: "service" },
  confirmParts: ["returned"],
  states: ["filled", "empty"],
  actions: { items: { returned: ["press"], remind: ["press"] } },
  read: (input, state, lang): string[] =>
    state === "filled" ? loanReading(input as z.output<typeof props>, lang) : [],
} as const satisfies c.Meta;

const loan = z
  .strictObject({
    thing: c.text(28),
    photo: c.photo.optional(),
    person: c.text(20),
    way: z.enum(["lent", "borrowed"]),
    since: c.isoDate,
    due: c.isoDate.optional(),
  })
  .refine(({ since, due }) => !due || since <= due, { path: ["due"] });
export const props = z.strictObject({ ...c.variantProps(meta.variants), loans: z.array(loan).min(1).max(6) });

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const type = c.thingOf(cast);
  const row = c.itemsOf(cast, 1)[0];
  return {
    loans: [
      {
        thing: (row && c.titleOf(row, 28, type)) ?? c.placeholderTitle(0, lang),
        person: (row && c.detailOf(row, 20, type)) ?? c.placeholderTitle(1, lang),
        way: "lent",
        since: "2026-01-01",
      },
    ],
  };
}

export const examples = [
  {
    loans: [
      {
        thing: "Pruning shears",
        photo: "lib:plants",
        person: "Ana",
        way: "lent",
        since: "2026-10-02",
        due: "2026-10-16",
      },
      { thing: "Soil moisture meter", person: "Jo", way: "borrowed", since: "2026-10-28", due: "2027-02-06" },
    ],
  },
  {
    loans: [{ thing: "Long training lead", person: "Sam", way: "borrowed", since: "2026-11-10" }],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Loans");
export const probes = [
  choose(
    "Keep track of tools I lent to neighbours and things I borrowed, when they are due back, and mark each returned",
  ),
  choose(
    "Show several tappable names leading to their own pages, without lending or borrowing records",
    "List",
  ),
  write(
    "I lent Ana my pruning shears on 2026-10-02 and they were due back 2026-10-16. The photo is lib:plants.",
  ),
  {
    ...write(
      "Track the pruning shears I lent Ana on 2026-10-02, due back 2026-10-16. Save both dates, but show only the due-back date, not when the loan started.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Mark the pruning shears as returned", { address: "l1/r1/returned", action: "press" }),
] satisfies c.Probe[];

type LoansProps = c.Props<typeof props, typeof meta>;
type LoanRowProps = Pick<LoansProps, "detail"> & { surface: c.SurfaceFinish } & {
  density: c.ThemeDensity;
  row: LoansProps["loans"][number];
  today: string;
};

// prettier-ignore
function LoanRow({ row, today, density, surface, detail }: LoanRowProps) {
  const scope = kit.usePartContext();
  const { lang, words: { loans: words } } = kit.useWords(inventoryWordsFor);
  const { since, due, overdue } = loanDates(row, detail, lang, today);
  const thumbnail = row.photo && <kit.KitPhoto part="photo" photo={row.photo} label={row.thing} />;
  return (
    <kit.PartScope {...scope} item={row.id}>
      <kit.KitCard part="root" padded label={row.thing} {...{ density, surface }}>
        <kit.KitRow part={null} inline label={row.thing} density={density}>
          <kit.KitGrid fitLast density={density}>
            <kit.KitContent density={density}>
              <kit.KitText part="thing" role="heading" density="comfortable">{row.thing}</kit.KitText>
              <kit.KitText part="person" role="caption" tone="muted" density={density}>
                <kit.KitText part="way" role="caption" tone="muted" density={density}>{words.way[row.way]}</kit.KitText>
                {row.person}
              </kit.KitText>
            </kit.KitContent>
            {thumbnail}
          </kit.KitGrid>
        </kit.KitRow>
        {(since || due) && <kit.KitContent density={density}>
          {since && <kit.KitText part="since" role="caption" tone="muted" density={density}>{since}</kit.KitText>}
          {due && <kit.KitText part="due" role="caption" density={density}>
            {due}{overdue && <kit.KitText part="overdue" role="caption" tone="bad" density={density}>{words.dueGap}{overdue}</kit.KitText>}
          </kit.KitText>}
        </kit.KitContent>}
        <kit.KitGrid density={density}>
          <kit.KitAction part="returned" label={words.returned} kind="secondary" full />
          <kit.KitAction part="remind" label={words.remind[row.way](row.person)} kind="quiet" full />
        </kit.KitGrid>
      </kit.KitCard>
    </kit.PartScope>
  );
}

export function Loans(input: LoansProps) {
  const state = kit.useComponentState();
  const density = kit.useKit().density;
  const surface = "card";
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  if (state === "empty")
    return (
      <kit.KitCard part="root" {...{ density, surface }}>
        <kit.KitEmpty part="empty" icon="package" decorativeIcon />
      </kit.KitCard>
    );
  const today = loanToday();
  return (
    <kit.KitCard part="root" style="cards" density={density}>
      {input.loans.map((row) => (
        <LoanRow key={row.id} {...{ row, density, surface, detail, today }} />
      ))}
    </kit.KitCard>
  );
}
