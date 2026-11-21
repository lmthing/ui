import { appointmentDate, moneyLine, type AppCurrency } from "../../../catalog";
import { propertyWordsFor } from "../lang";

type Period = "night" | "week" | "month";
type Unit = {
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
  rent: number;
  per: Period;
  cancelled: boolean;
};
type Snapshot = { units: readonly Unit[]; lets: readonly Let[]; on: string };

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

export function unitSnapshot(
  unit: Unit,
  lets: readonly Let[],
  on: string,
  lang?: string,
  currency?: AppCurrency,
) {
  const active = lets.filter((record) => record.unitRef === unit.unitRef && !record.cancelled);
  const current = active.find(({ start, end }) => start <= on && (end === undefined || on < end));
  const status: "occupied" | "reserved" | "vacant" = current
    ? "occupied"
    : active.some(({ start }) => start > on)
      ? "reserved"
      : "vacant";
  const rent = current?.rent ?? unit.askingRent;
  const per = current?.per ?? unit.askingPer;
  return {
    status,
    occupant: current?.occupant,
    rent: rent === undefined ? undefined : moneyLine(rent, currency, per, lang),
  };
}

export function unitReading({ on, units, lets }: Snapshot, lang?: string, currency?: AppCurrency): string[] {
  const words = propertyWordsFor(lang).units;
  return [
    words.dateReading(appointmentDate(on, lang), on),
    ...units.map((unit, index) => {
      const snapshot = unitSnapshot(unit, lets, on, lang, currency);
      const { status, occupant, rent } = snapshot;
      return words.unitReading(
        `r${index + 1}`,
        [unit.title, words.status[status], occupant, rent].filter((value) => value !== undefined),
      );
    }),
  ];
}
