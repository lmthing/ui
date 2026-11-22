import { components, documentTotals, projectLiveInputs, stampItemIds } from "@lmthing/ui/catalog";
import type { DeviceData, ScreenLike, Values } from "@lmthing/ui/catalog";

type Entry = ScreenLike["components"][number];

function inputOf({ id: _id, c: _c, state: _state, ...input }: Entry) {
  return input;
}

function basketFor(screen: ScreenLike): DeviceData["basket"] {
  const cart = screen.components.find(({ c }) => c === "Cart");
  if (!cart || cart.state === "empty") return [];
  const { lines, delivery = 0 } = components.Cart.props.parse(inputOf(cart));
  const { total } = documentTotals({ lines: [...lines, { qty: 1, price: delivery }] });
  return [{ total }];
}

function receiptsFor(screen: ScreenLike, values: Values) {
  const receipts = screen.components.find(({ c }) => c === "Receipts");
  if (!receipts || receipts.state === "empty") return [];
  const { meta, props } = components.Receipts;
  const wire = inputOf(receipts);
  const parsed = props.parse(wire);
  // Review is a local control value, not written back to the wire. Keep the evidence tags
  // even if the receipt's display options hide them.
  const seeded = stampItemIds(meta, { ...parsed, items: wire.items });
  const { items } = projectLiveInputs(
    meta,
    seeded,
    receipts.id,
    (part) => values[`${screen.id}/${receipts.id}/${part}`],
  );
  return items as typeof parsed.items;
}

function paperworkFor(screen: ScreenLike, taxYear: Entry, values: Values): DeviceData["paperwork_evidence"] {
  const { from, to } = components.TaxYear.props.parse(inputOf(taxYear));
  const period = { from, to };
  const documents = screen.components.find(({ c }) => c === "Documents");
  const docs = documents ? components.Documents.props.parse(inputOf(documents)).docs : [];
  return [
    ...docs.flatMap(({ file, tags, issued }) =>
      file ? [{ period, source: "documents", file, tags, date: issued }] : [],
    ),
    ...receiptsFor(screen, values).map(({ file, tags, date, reviewed, amount, allocation }) => ({
      period,
      source: "receipts",
      file,
      tags,
      date,
      reviewed,
      amount,
      allocation,
    })),
  ];
}

/** Project host records that are shared by potentially edited components in one worked phone. */
export function linkedRecords(screen: ScreenLike, values: Values = {}): DeviceData | undefined {
  const taxYear = screen.components.find(({ c }) => c === "TaxYear");
  if (taxYear) return { paperwork_evidence: paperworkFor(screen, taxYear, values) };
  if (screen.components.some(({ c }) => c === "Checkout")) return { basket: basketFor(screen) };
}
