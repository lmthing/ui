// Keep the precision of the stored decimal amounts without introducing a currency prop.
export function decimalLedger(amounts: readonly number[]) {
  const terms = amounts.map(decimalTerm);
  const places = Math.max(0, ...terms.map(({ places }) => places));
  return {
    values: terms.map(({ digits, places: source }) => digits * 10n ** BigInt(places - source)),
    amount: (value: bigint) => Number(`${value}e-${places}`),
  };
}

type Charge = { chargeRef: string; unitRef: string; unit: string; due: string; amount: number };
type Receipt = { chargeRef: string; amount: number; voided: boolean };

export function ledgerRows<C extends Charge, R extends Receipt>(
  value: { charges: readonly C[]; receipts: readonly R[]; month: string; style: string },
  today: string,
) {
  const { charges, receipts, month, style } = value;
  const { values, amount } = decimalLedger([...charges, ...receipts].map((record) => record.amount));
  const paidBy = new Map<string, bigint>();
  receipts.forEach((receipt, index) => {
    if (!receipt.voided)
      paidBy.set(receipt.chargeRef, (paidBy.get(receipt.chargeRef) ?? 0n) + values[charges.length + index]!);
  });
  const entries = charges.map((charge, index) => {
    const assessed = values[index]!,
      paid = paidBy.get(charge.chargeRef) ?? 0n;
    const outstanding = assessed > paid ? assessed - paid : 0n;
    const period = charge.due.slice(0, 7);
    const arrears = charge.due < today && outstanding > 0n;
    return {
      charge,
      assessed,
      paid,
      outstanding,
      period,
      arrears,
      inPeriod: period === month || (period < month && arrears),
    };
  });
  const unpaidUnits = new Set(
    entries
      .filter(({ inPeriod, outstanding }) => inPeriod && outstanding > 0n)
      .map(({ charge }) => charge.unitRef),
  );
  const chargeLines = entries.map(({ charge, assessed, paid, outstanding, inPeriod }) => ({
    ...charge,
    kind: "charge" as const,
    visible: inPeriod && (style === "ledger" || unpaidUnits.has(charge.unitRef)),
    paid: amount(paid),
    outstanding: amount(outstanding),
    credit: paid > assessed ? amount(paid - assessed) : 0,
    unpaid: outstanding > 0n,
    record: { goto: "property_rent_receipt" },
  }));
  const lines = [
    ...chargeLines,
    ...receipts.flatMap((receipt) => {
      const charge = chargeLines.find(({ chargeRef }) => chargeRef === receipt.chargeRef);
      return charge
        ? [{ ...receipt, unit: charge.unit, kind: "receipt" as const, visible: charge.visible }]
        : [];
    }),
  ];
  return { lines, totals: periodTotals(entries, month, amount) };
}

type Reconciled = { period: string; assessed: bigint; paid: bigint; outstanding: bigint; arrears: boolean };

function periodTotals(entries: readonly Reconciled[], month: string, amount: (value: bigint) => number) {
  const totals = { assessed: 0n, received: 0n, outstanding: 0n, arrears: 0n };
  for (const entry of entries) {
    if (entry.period === month) {
      totals.assessed += entry.assessed;
      totals.received += entry.paid;
      totals.outstanding += entry.outstanding;
    }
    if (entry.period <= month && entry.arrears) totals.arrears += entry.outstanding;
  }
  return {
    month,
    assessed: amount(totals.assessed),
    received: amount(totals.received),
    outstanding: amount(totals.outstanding),
    arrears: amount(totals.arrears),
  };
}

function decimalTerm(amount: number) {
  const [mantissa, exponent] = String(amount).split("e");
  const [whole, fraction = ""] = mantissa!.split(".");
  return { digits: BigInt(whole! + fraction), places: fraction.length - Number(exponent ?? 0) };
}
