import { moneyLine } from "../../../catalog";
import {
  KitCard,
  KitState,
  useAppCurrency,
  useComponentState,
  useWords,
  type LayoutLine,
} from "../../../kit";
import { SeatPlan, type SeatPlanProps } from "../../../kit/renderers";
import { tripsWordsFor } from "../lang";

type Grid = Extract<SeatPlanProps, { kind: "grid" }>;
type Seat = Grid["sections"][number]["rows"][number]["seats"][number];
type CabinSeat = {
  col: string;
  status: "open" | "occupied" | "extra" | "selected";
  fee?: number;
  target?: Seat["target"];
};
type CabinRow = { row: number; exit?: boolean; seats: readonly CabinSeat[] };
export type CabinSeatsView = {
  cabin: string;
  columns: readonly string[];
  rows: readonly CabinRow[];
  passenger?: string;
  style?: "cabin" | "compact";
  selection?: { row: number; col: string } | null;
  confirmPart: string;
};

type Words = ReturnType<typeof tripsWordsFor>["cabinSeats"];
type Picked = { row: number; seat: CabinSeat };

function findSelection(
  rows: readonly CabinRow[],
  columns: readonly string[],
  selection: CabinSeatsView["selection"],
): Picked | undefined {
  for (const { row, seats } of rows) {
    const seat = seats.find(
      ({ status, col }) =>
        col &&
        columns.includes(col) &&
        (selection === undefined
          ? status === "selected"
          : selection?.row === row && selection.col === col && status !== "occupied"),
    );
    if (seat) return { row, seat };
  }
}

function seatDetails(row: string, seat: CabinSeat, selected: boolean, exit: boolean, words: Words) {
  const status = seat.status === "selected" ? "open" : seat.status;
  const note = exit ? words.exit : undefined;
  const code = words.seat(row, seat.col);
  return selected
    ? words.details(code, words.status.selected, status === "extra" ? words.status.extra : undefined, note)
    : words.details(code, words.status[status], note);
}

function cabinRow(
  { row, exit, seats }: CabinRow,
  columns: readonly string[],
  selected: Picked | undefined,
  words: Words,
  number: Intl.NumberFormat,
) {
  const label = number.format(row);
  return {
    label,
    seats: columns.map((col, index): Seat => {
      const seat = col && seats.find((seat) => seat.col === col);
      if (!seat) return { id: String(index), label: "", kind: "aisle" };
      const occupied = seat.status === "occupied";
      const chosen = selected?.row === row && selected.seat === seat;
      return {
        id: col,
        label: col,
        kind: occupied ? "taken" : chosen ? "selected" : "free",
        ...(!occupied && seat.target ? { target: { ...seat.target, action: "select" as const } } : {}),
        ...(exit || seat.status === "extra" ? { badge: "star" as const } : {}),
        accessibleLabel: seatDetails(label, seat, chosen, Boolean(exit), words),
      };
    }),
  };
}

/** The seat owner projects the single selection and supplies select/confirm targets. */
export function CabinSeats({
  cabin,
  columns,
  rows,
  passenger,
  style,
  selection,
  confirmPart,
}: CabinSeatsView) {
  const {
    lang,
    words: { cabinSeats: words },
  } = useWords(tripsWordsFor);
  const currency = useAppCurrency();
  const loading = useComponentState() === "loading";
  const number = new Intl.NumberFormat(lang, { useGrouping: false });
  const selected = findSelection(rows, columns, selection);
  const index = selected ? rows.findIndex(({ row }) => row === selected.row) : -1;
  const visible = style === "compact" && index >= 0 ? rows.slice(Math.max(0, index - 1), index + 2) : rows;
  const cabinRows = visible.map((row) => cabinRow(row, columns, selected, words, number));
  const preview =
    selected &&
    seatDetails(number.format(selected.row), selected.seat, true, Boolean(rows[index]?.exit), words);
  const fee = selected?.seat.fee;
  const plan = (
    <SeatPlan
      kind="grid"
      part={null}
      loading={loading}
      {...(passenger ? { screenLabel: passenger } : {})}
      sections={cabinRows.length ? [{ id: "cabin", label: cabin, rows: cabinRows }] : []}
      legend={{ text: words.legend, role: "caption" }}
      {...(preview ? { preview: { text: preview, role: "body" } } : {})}
      {...(fee === undefined
        ? {}
        : {
            total: {
              text: words.upgrade(moneyLine(fee, currency, undefined, lang)),
              role: "meta",
            } satisfies LayoutLine,
          })}
      action={{ part: confirmPart, action: "press", label: words.confirm, disabled: !selected }}
    />
  );
  return (
    <KitCard padded>
      <KitState loading={plan} retain>
        {plan}
      </KitState>
    </KitCard>
  );
}
