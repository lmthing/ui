import { numberLine, type ThemeDensity } from "../../../catalog";
import {
  KitAction,
  KitActionFooter,
  KitCard,
  KitContent,
  KitEmpty,
  KitGrid,
  KitLayoutText,
  KitState,
  useAppCurrency,
  useComponentState,
  useHostOperations,
  useWords,
} from "../../../kit";
import { SeatPlan } from "../../../kit/renderers";
import {
  cabinFee,
  cabinLegend,
  cabinSeatDetails,
  cabinSuccess,
  cabinWindow,
  type CabinSeat as SeatData,
} from "../copy";
import { tripsWordsFor } from "../lang";

type CabinSeat = SeatData & { target?: { item?: string; part: string } };
type CabinRow = { row: number; exit?: boolean; seats: readonly CabinSeat[] };
export type CabinSeatsView = {
  cabin: string;
  columns: readonly string[];
  rows: readonly CabinRow[];
  passenger?: string;
  style?: "cabin" | "compact";
  selection?: { row: number; col: string } | null;
  confirmPart: string;
  density?: ThemeDensity;
  surface?: "card" | "outlined";
};

type Picked = { row: number; seat: CabinSeat; exit?: boolean };

function findSelection(
  rows: readonly CabinRow[],
  columns: readonly string[],
  selection: CabinSeatsView["selection"],
): Picked | undefined {
  for (const { row, seats, exit } of rows) {
    const seat = seats.find(
      ({ status, col }) =>
        col &&
        columns.includes(col) &&
        (selection === undefined
          ? status === "selected"
          : selection?.row === row && selection.col === col && status !== "occupied"),
    );
    if (seat) return { row, seat, ...(exit ? { exit } : {}) };
  }
}

function cabinRow(
  { row, exit, seats }: CabinRow,
  columns: readonly string[],
  selected: Picked | undefined,
  interactive: boolean,
  lang: string,
) {
  return {
    label: numberLine(row, lang),
    ...(exit ? { mark: { icon: "flag" as const, label: tripsWordsFor(lang).cabinSeats.exit } } : {}),
    seats: columns.map((col, index) => {
      const seat = col && seats.find((seat) => seat.col === col);
      if (!seat) return { id: String(index), label: "", kind: "aisle" as const };
      const occupied = seat.status === "occupied";
      const chosen = selected?.row === row && selected.seat === seat;
      return {
        id: col,
        label: seat.status === "extra" ? tripsWordsFor(lang).cabinSeats.extraLabel(col) : col,
        kind: occupied ? ("taken" as const) : chosen ? ("selected" as const) : ("free" as const),
        ...(interactive && !occupied && seat.target
          ? { target: { ...seat.target, action: "select" as const } }
          : {}),
        accessibleLabel: cabinSeatDetails(row, seat, chosen, exit, lang),
      };
    }),
  };
}

type CabinWords = ReturnType<typeof tripsWordsFor>["cabinSeats"];
type CabinPlan = {
  cabinRows: ReturnType<typeof cabinRow>[];
  legend: ReturnType<typeof cabinLegend>;
  preview: string;
  fee: ReturnType<typeof cabinFee>;
  loading: boolean;
  selected: Picked | undefined;
};

function RenderCabinPlan(
  { cabin, passenger, confirmPart, density }: CabinSeatsView,
  words: CabinWords,
  { cabinRows, legend, preview, fee, loading, selected }: CabinPlan,
) {
  return (
    <KitContent density={density}>
      {passenger && (
        <KitLayoutText
          line={{ text: passenger, part: "passenger", role: "meta", tone: "muted" }}
          density={density}
        />
      )}
      <SeatPlan
        kind="grid"
        part={null}
        sections={cabinRows.length ? [{ id: "cabin", label: cabin, rows: cabinRows }] : []}
        {...(legend ? { legend: { text: legend, role: "caption", part: "legend" } } : {})}
        preview={{ text: preview, role: "body", part: "preview" }}
      />
      {fee && (
        <KitGrid fitLast density={density}>
          <KitLayoutText
            line={{ text: words.upgradeLabel, role: "meta", tone: "muted", part: "fee_label" }}
            density={density}
          />
          <KitLayoutText
            line={{ text: fee, role: "figure", compact: true, tabular: true, part: "fee" }}
            align="end"
            density={density}
          />
        </KitGrid>
      )}
      <KitActionFooter density={density}>
        <KitAction
          part={loading ? null : confirmPart}
          action="press"
          label={words.confirm}
          contentParts={{}}
          kind={selected ? "primary" : "secondary"}
          disabled={!selected}
        />
      </KitActionFooter>
    </KitContent>
  );
}

function CabinSuccessCard(
  { cabin, rows, passenger, density }: CabinSeatsView,
  lang: string,
  words: CabinWords,
  finish: Pick<CabinSeatsView, "density" | "surface">,
) {
  return (
    <KitCard part="root" padded {...finish}>
      <KitEmpty
        part="notice"
        density={density}
        tone="good"
        prominence="heading"
        icon="check"
        announce="status"
        decorativeIcon
        title={cabinSuccess(rows, lang)}
        sub={words.details(cabin, passenger)}
      />
    </KitCard>
  );
}

/** The seat owner projects the single selection and supplies select/confirm targets. */
export function CabinSeats(input: CabinSeatsView) {
  const { rows, columns, style, selection, density, surface } = input;
  const {
    lang,
    words: { cabinSeats: words },
  } = useWords(tripsWordsFor);
  const currency = useAppCurrency();
  const state = useComponentState();
  const operation = useHostOperations().find(({ name }) => name === "reserve_seat");
  const selected = findSelection(rows, columns, selection);
  const visible = cabinWindow(rows, selected?.row, style === "compact");
  const legend = cabinLegend(visible, lang);
  const cabinRows = visible.map((row) => cabinRow(row, columns, selected, state === "filled", lang));
  const preview = selected
    ? cabinSeatDetails(selected.row, selected.seat, true, selected.exit, lang)
    : words.choose;
  const fee = cabinFee(selected?.seat.fee, currency, lang);
  const loading = state === "loading";
  const finish = { ...(density ? { density } : {}), ...(surface ? { surface } : {}) };
  if (state === "success") return CabinSuccessCard(input, lang, words, finish);
  const plan = RenderCabinPlan(input, words, { cabinRows, legend, preview, fee, loading, selected });
  return (
    <KitCard part="root" padded {...finish}>
      <KitState
        part="notice"
        loading={plan}
        density={density}
        message={state === "empty" || state === "error" ? words[state] : undefined}
      >
        <KitContent density={density}>
          {state === "filled" && (operation?.status === "pending" || operation?.status === "rejected") && (
            <KitLayoutText
              line={{
                text: operation.status === "pending" ? words.pending : words.error,
                part: "notice",
                role: "meta",
                tone: operation.status === "pending" ? "muted" : "bad",
              }}
              density={density}
            />
          )}
          {plan}
        </KitContent>
      </KitState>
    </KitCard>
  );
}
