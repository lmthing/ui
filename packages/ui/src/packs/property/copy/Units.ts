import { appointmentDate, moneyLine, type AppCurrency, type Values } from "../../../catalog";
import { propertyWordsFor } from "../lang";

type Period = "night" | "week" | "month";
type Unit = {
  id?: string | undefined;
  unitRef: string;
  title: string;
  address?: string | undefined;
  askingRent?: number | undefined;
  askingPer?: Period | undefined;
};
type Let = {
  unitRef: string;
  occupant: string;
  start: string;
  end?: string | undefined;
  noticeGivenOn?: string | undefined;
  rent: number;
  per: Period;
  cancelled: boolean;
};
type Snapshot = {
  units: readonly Unit[];
  lets: readonly Let[];
  on: string;
  style?: "register" | "vacancies" | undefined;
};

export function exclusiveLets(lets: readonly Let[]) {
  const active = lets.filter(({ cancelled }) => !cancelled);
  return active.every((a, index) =>
    active
      .slice(index + 1)
      .every(
        (b) =>
          a.unitRef !== b.unitRef ||
          (a.end !== undefined && a.end <= b.start) ||
          (b.end !== undefined && b.end <= a.start),
      ),
  );
}

function unitOccupancy(unit: Unit, lets: readonly Let[], on: string) {
  const active = lets.filter((record) => record.unitRef === unit.unitRef && !record.cancelled);
  const current = active.find(({ start, end }) => start <= on && (end === undefined || on < end));
  const status: "occupied" | "reserved" | "vacant" = current
    ? "occupied"
    : active.some(({ start }) => start > on)
      ? "reserved"
      : "vacant";
  return { status, current, notice: current?.noticeGivenOn !== undefined && current.noticeGivenOn <= on };
}

export function unitSnapshot(
  unit: Unit,
  lets: readonly Let[],
  on: string,
  lang?: string,
  currency?: AppCurrency,
) {
  const { status, current } = unitOccupancy(unit, lets, on);
  const rent = current?.rent ?? unit.askingRent;
  const per = current?.per ?? unit.askingPer;
  return {
    status,
    occupant: current?.occupant,
    rent: rent === undefined ? undefined : moneyLine(rent, currency, per, lang),
  };
}

function vacancy(unit: Unit, lets: readonly Let[], on: string) {
  const { status, notice } = unitOccupancy(unit, lets, on);
  return { visible: status === "vacant" || notice, notice };
}

export function unitDisplay(input: Values): Values {
  const { units, lets, on, style } = input as Snapshot & { units: (Unit & Values)[] };
  return {
    units: units.map((unit) => ({
      ...unit,
      ...(style === "vacancies" ? vacancy(unit, lets, on) : { visible: true, notice: false }),
    })),
  };
}

export function unitReading(
  { on, units, lets, style }: Snapshot,
  lang?: string,
  currency?: AppCurrency,
): string[] {
  const words = propertyWordsFor(lang).units;
  const rows = units.flatMap((unit, index) => {
    const { visible, notice } =
      style === "vacancies" ? vacancy(unit, lets, on) : { visible: true, notice: false };
    if (!visible) return [];
    const { status, occupant, rent } = unitSnapshot(unit, lets, on, lang, currency);
    return words.unitReading(
      unit.id ?? `r${index + 1}`,
      [unit.title, notice ? words.notice : words.status[status], occupant, rent].filter(
        (value) => value !== undefined,
      ),
    );
  });
  return [
    words.dateReading(appointmentDate(on, lang), on),
    ...(style === "vacancies" ? [words.vacancies] : []),
    ...(!rows.length && style === "vacancies" ? [words.noVacancies] : rows),
  ];
}
