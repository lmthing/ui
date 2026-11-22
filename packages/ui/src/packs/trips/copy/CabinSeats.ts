import { moneyLine, numberLine, type AppCurrency, type StateName } from "../../../catalog";
import { tripsWordsFor } from "../lang";

export const cabinSeatStatuses = ["open", "occupied", "extra", "selected"] as const;
export type CabinSeat = { col: string; status: (typeof cabinSeatStatuses)[number]; fee?: number | undefined };
export type CabinRow = { row: number; exit?: boolean | undefined; seats: readonly CabinSeat[] };
type SeatTarget = CabinSeat & { row: number; code: string; id: string; visible: boolean };

export type CabinInventory = {
  columns: readonly string[];
  rows: readonly CabinRow[];
  detail?: "full" | "brief" | undefined;
};
type CabinLive = CabinInventory & {
  selectedSeat?: string;
  $seats: SeatTarget[];
};

export function validCabin({ columns, rows }: CabinInventory) {
  const letters = columns.filter(Boolean);
  return (
    letters.length > 0 &&
    new Set(letters).size === letters.length &&
    new Set(rows.map(({ row }) => row)).size === rows.length &&
    rows.every(
      ({ seats }) =>
        seats.every(({ col }) => letters.includes(col)) &&
        new Set(seats.map(({ col }) => col)).size === seats.length,
    ) &&
    rows.flatMap(({ seats }) => seats).filter(({ status }) => status === "selected").length <= 1
  );
}

function seatId(row: number, col: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const position = [...col].reduce((at, letter) => at * alphabet.length + alphabet.indexOf(letter) + 1, 0);
  return `r${row * 1000 + position}`;
}

function cabinTargets({ rows, columns }: CabinInventory) {
  return rows.flatMap(({ row, seats }) =>
    columns.flatMap((col): SeatTarget[] => {
      const seat = seats.find((seat) => seat.col === col);
      return !seat || seat.status === "occupied"
        ? []
        : [{ ...seat, row, code: `${row}${col}`, id: seatId(row, col), visible: true }];
    }),
  );
}

export function cabinWindow<T extends CabinRow>(rows: readonly T[], focus?: number, brief?: boolean) {
  const at = brief && focus !== undefined ? rows.findIndex(({ row }) => row === focus) : -1;
  return at < 0 ? rows : rows.slice(Math.max(0, at - 1), at + 2);
}

export function cabinSelection({ $seats, selectedSeat }: CabinLive) {
  return $seats.find(({ code }) => code === selectedSeat);
}

export function cabinControls(input: Omit<CabinLive, "$seats">) {
  const targets = cabinTargets(input);
  const selectedSeat = input.selectedSeat ?? targets.find(({ status }) => status === "selected")?.code;
  const selection = targets.find(({ code }) => code === selectedSeat);
  const visible = new Set(
    cabinWindow(input.rows, selection?.row, input.detail === "brief").map(({ row }) => row),
  );
  return {
    selectedSeat,
    canConfirm: Boolean(selection),
    $seats: targets.map((seat) => ({ ...seat, visible: visible.has(seat.row) })),
  };
}

export function cabinSeatDetails(
  row: number,
  seat: CabinSeat,
  selected: boolean,
  exit?: boolean,
  lang?: string,
) {
  const words = tripsWordsFor(lang).cabinSeats;
  const status = seat.status === "selected" ? "open" : seat.status;
  const code = words.seat(numberLine(row, lang), seat.col);
  return words.details(
    code,
    selected ? words.status.selected : words.status[status],
    selected && status === "extra" ? words.status.extra : undefined,
    exit ? words.exit : undefined,
  );
}

export function cabinFee(fee?: number, currency?: AppCurrency, lang?: string) {
  return fee === undefined ? undefined : moneyLine(fee, currency, undefined, lang);
}

export function cabinLegend(rows: readonly CabinRow[], lang?: string) {
  const words = tripsWordsFor(lang).cabinSeats;
  return words.details(
    rows.some(({ seats }) => seats.some(({ status }) => status === "extra")) ? words.legendExtra : undefined,
    rows.some(({ exit }) => exit) ? words.legendExit : undefined,
  );
}

export function cabinSuccess(rows: readonly CabinRow[], lang?: string) {
  const words = tripsWordsFor(lang).cabinSeats;
  for (const { row, seats } of rows) {
    const seat = seats.find(({ status }) => status === "selected");
    if (seat) return words.successSeat(words.seat(numberLine(row, lang), seat.col));
  }
  return words.success;
}

export function cabinReading(input: CabinLive, state: StateName, lang?: string, currency?: AppCurrency) {
  const words = tripsWordsFor(lang).cabinSeats;
  if (state === "empty" || state === "error") return [words[state]];
  if (state === "loading") return [];
  if (state === "success") return [cabinSuccess(input.rows, lang)];
  const selected = cabinSelection(input);
  const rows = cabinWindow(input.rows, selected?.row, input.detail === "brief");
  const legend = cabinLegend(rows, lang);
  const targets = new Map(input.$seats.map((seat) => [seat.code, seat.id]));
  const details = rows.flatMap(({ row, seats, exit }) => [
    numberLine(row, lang),
    ...seats.flatMap((seat) => {
      const code = `${row}${seat.col}`;
      const text = cabinSeatDetails(row, seat, selected?.code === code, exit, lang);
      return [
        [targets.get(code), text].filter(Boolean).join(" "),
        ...(seat.status === "extra" ? [words.extraLabel(seat.col)] : []),
      ];
    }),
  ]);
  const fee = cabinFee(selected?.fee, currency, lang);
  return [
    words.confirm,
    ...(legend ? [legend] : []),
    ...(!selected ? [words.choose] : []),
    ...details,
    ...(fee ? [words.upgrade(words.upgradeLabel, fee)] : []),
  ];
}
