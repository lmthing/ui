import * as c from "../../../catalog";
import { communityWordsFor } from "../lang";

type Assessment = { id: string; memberId: string; amount: number; due: string };
type Receipt = {
  id: string;
  assessmentId: string;
  amount: number;
  date: string;
  method: "cash" | "transfer" | "card";
  voided: boolean;
};
type Balance = { paid: number; outstanding: number; credit: number };
type Status = "paid" | "partial" | "unpaid" | "overdue";
export type DuesRow = { id: string; entryId: string; visible: boolean } & (
  | (Omit<Assessment, "id"> &
      Balance & { kind: "assessment"; status: Status; can_remind: boolean; can_pay: boolean })
  | (Omit<Receipt, "id"> & { kind: "receipt"; memberId: string })
);
type Ledger = {
  assessments: Assessment[];
  receipts: Receipt[];
  entries: DuesRow[];
  style: "ledger" | "member";
};
type Host = {
  today: string;
  memberId?: string;
  treasurer: boolean;
  reminders?: boolean;
  payments?: boolean;
};

const clean = (amount: number) => Number(amount.toPrecision(15));

function balances({ assessments, receipts }: Pick<Ledger, "assessments" | "receipts">) {
  const payments = new Map<string, number>();
  for (const row of receipts) {
    if (!row.voided)
      payments.set(row.assessmentId, clean((payments.get(row.assessmentId) ?? 0) + row.amount));
  }
  return new Map(
    assessments.map(({ id, amount }) => {
      const paid = payments.get(id) ?? 0;
      const delta = clean(amount - paid);
      return [id, { paid, outstanding: Math.max(0, delta), credit: Math.max(0, -delta) }] as const;
    }),
  );
}

/** Default to the local ledger without any attached services. Real hosts bind the actor and capabilities. */
export function duesProjection(hostFor?: (instance: string) => Host | undefined) {
  return (input: c.Values, instance: string): c.Values => {
    const ledger = input as Ledger;
    const host = hostFor?.(instance);
    const treasurer = hostFor ? host?.treasurer === true : true;
    const byAssessment = balances(ledger);
    const members = new Map(ledger.assessments.map(({ id, memberId }) => [id, memberId]));
    const visible = (memberId: string) =>
      ledger.style === "ledger" ? treasurer : !hostFor || host?.memberId === memberId;
    const entries = ledger.entries.map((row): DuesRow => {
      if (row.kind === "receipt") {
        const memberId = members.get(row.assessmentId)!;
        return { ...row, memberId, visible: visible(memberId) };
      }
      const balance = byAssessment.get(row.entryId)!;
      const { outstanding, paid } = balance;
      const status = !outstanding
        ? "paid"
        : host?.today && row.due < host.today
          ? "overdue"
          : paid
            ? "partial"
            : "unpaid";
      return {
        ...row,
        ...balance,
        status,
        visible: visible(row.memberId),
        can_remind: Boolean(host?.reminders && outstanding),
        can_pay: Boolean(host?.payments && host.memberId === row.memberId && outstanding),
      };
    });
    return { entries, treasurer };
  };
}

export function ledgerTotals(entries: readonly DuesRow[]) {
  return entries.reduce(
    (totals, row) =>
      row.kind !== "assessment" || !row.visible
        ? totals
        : {
            assessed: clean(totals.assessed + row.amount),
            collected: clean(totals.collected + row.paid),
            outstanding: clean(totals.outstanding + row.outstanding),
          },
    { assessed: 0, collected: 0, outstanding: 0 },
  );
}

export const duesMoney = (amount: number, lang?: string) => c.moneyLine(amount, undefined, undefined, lang);

const refLabel = (ref: string, lang?: string) =>
  ref.charAt(0).toLocaleUpperCase(c.localeOf(lang)) + ref.slice(1).replaceAll("_", " ");

export function duesRowCopy(row: DuesRow, ledger: boolean, lang?: string) {
  const w = communityWordsFor(lang).dues;
  const money = (amount: number) => duesMoney(amount, lang);
  const name = refLabel(row.memberId, lang);
  const title = row.kind === "assessment" ? name : w.receipt(name, refLabel(row.entryId, lang));
  const fields: [string, string][][] =
    row.kind === "assessment"
      ? [
          [["due", w.due(c.appointmentDate(row.due, lang))]],
          [
            ["paid", w.paid(money(row.paid))],
            ["outstanding", w.balance(money(row.outstanding))],
          ],
          ...(row.credit > 0 ? [[["credit", w.credit(money(row.credit))] as [string, string]]] : []),
        ]
      : [
          [
            ["method", w.method[row.method]],
            ["date", c.appointmentDate(row.date, lang)],
          ],
        ];
  const controls =
    row.kind === "assessment"
      ? ([ledger && "record", ledger && row.can_remind && "remind", !ledger && row.can_pay && "pay"] as const)
      : ([ledger && !row.voided && "void"] as const);
  const badge = row.kind === "assessment" ? w.status[row.status] : row.voided ? w.voided : undefined;
  return { title, fields, controls, badge, amount: money(row.amount) };
}

export function duesReading(input: unknown, state: c.StateName, lang?: string): string[] {
  if (state !== "filled") return [];
  const { entries, style } = input as Ledger;
  const w = communityWordsFor(lang).dues;
  const money = (amount: number) => duesMoney(amount, lang);
  const totals = ledgerTotals(entries);
  return [
    ...(["assessed", "collected", "outstanding"] as const).map((key) => `${w[key]} ${money(totals[key])}`),
    ...entries
      .filter((row) => row.visible)
      .map((row) => {
        const { title, fields, amount, badge, controls } = duesRowCopy(row, style === "ledger", lang);
        return `${row.id}: ${[
          title,
          amount,
          ...fields.flat().map(([, text]) => text),
          badge,
          ...controls.map((key) => key && w[key]),
        ]
          .filter(Boolean)
          .join(w.separator)}`;
      }),
  ];
}
