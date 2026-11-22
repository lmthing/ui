import { appointmentDate, localeOf, numberLine, timeOfDayLine, type StateName } from "../../../catalog";
import { propertyWordsFor, type PropertyWords } from "../lang";

type MeterUnit = keyof PropertyWords["meters"]["units"];
type Meter = { meterRef: string; title: string; unit: MeterUnit };
type Reading = { meterRef: string; at: string; value: number; photo?: string | undefined };
type Wire = { meters: readonly Meter[]; readings: readonly Reading[] };
type Register = "register" | "history";
type ReadInput = Wire & {
  style: Register;
  detail: "full" | "brief";
  entries: (ReturnType<typeof meterEntries>[number] & { id: string })[];
};

export function meterEntries<M extends Meter, R extends Reading>(
  { meters, readings }: { meters: readonly M[]; readings: readonly R[] },
  style: Register,
  selected = meters[0]?.meterRef,
) {
  const register = meters.map((row) => ({ ...row, entryKind: "meter", visible: true }) as const);
  if (style === "register") return register;
  return [
    ...register,
    ...readings.map(
      (row) =>
        ({
          ...row,
          entryKind: "reading",
          visible: row.meterRef === selected,
          hasPhoto: Boolean(row.photo),
        }) as const,
    ),
  ];
}

export function meterSeries<T extends Reading>(readings: readonly T[], meterRef: string): T[] {
  return readings
    .filter((reading) => reading.meterRef === meterRef)
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}

export function validMeterSeries(series: readonly Reading[], now: number): boolean {
  return series.every(({ at, value }, index) => {
    const previous = series[index - 1];
    const time = Date.parse(at);
    return time <= now && (!previous || (time > Date.parse(previous.at) && value >= previous.value));
  });
}

export function meterValue(value: number, unit: MeterUnit, lang?: string): string {
  const { meters } = propertyWordsFor(lang);
  return meters.amount(numberLine(value, lang), meters.units[unit]);
}

export function meterDate(at: string, lang?: string): string {
  return propertyWordsFor(lang).meters.dateTime(
    appointmentDate(at.slice(0, 10), lang),
    timeOfDayLine(at.slice(11, 16), lang),
  );
}

function decimal(value: number) {
  const [mantissa, power = "0"] = String(value).split("e");
  const [whole, fraction = ""] = mantissa!.split(".");
  return { digits: BigInt(`${whole}${fraction}`), power: Number(power) - fraction.length };
}

/** Subtract the stored decimal values without displaying binary subtraction noise. */
function difference(value: number, previous: number): number {
  const later = decimal(value);
  const earlier = decimal(previous);
  const power = Math.min(later.power, earlier.power);
  const scaled = (n: typeof later) => n.digits * 10n ** BigInt(n.power - power);
  return Number(`${scaled(later) - scaled(earlier)}e${power}`);
}

function elapsedLine(ms: number, lang?: string) {
  const seconds = ms / 1000;
  const unit = seconds >= 86400 ? "day" : seconds >= 3600 ? "hour" : seconds >= 60 ? "minute" : "second";
  const size = { day: 86400, hour: 3600, minute: 60, second: 1 }[unit];
  return new Intl.NumberFormat(localeOf(lang), {
    style: "unit",
    unit,
    unitDisplay: "short",
    maximumFractionDigits: 2,
  }).format(seconds / size);
}

export function meterUsage(current: Reading, previous: Reading, unit: MeterUnit, lang?: string): string {
  return propertyWordsFor(lang).meters.usage(
    meterValue(difference(current.value, previous.value), unit, lang),
    elapsedLine(Date.parse(current.at) - Date.parse(previous.at), lang),
  );
}

export function meterSummary(series: readonly Reading[], unit: MeterUnit, lang?: string) {
  const { meters } = propertyWordsFor(lang);
  const latest = series.at(-1);
  const previous = series.at(-2);
  return {
    latest: latest ? meterValue(latest.value, unit, lang) : undefined,
    previous: previous ? meters.previous(meterValue(previous.value, unit, lang)) : undefined,
    usage: latest && previous ? meterUsage(latest, previous, unit, lang) : undefined,
  };
}

type DatedEntry = Reading & { id: string; entryKind: "reading"; visible: boolean };
export function historyRows(input: ReadInput, lang?: string) {
  const rows = input.entries.filter(
    (row): row is Extract<typeof row, DatedEntry> => row.entryKind === "reading" && row.visible,
  );
  const unit = input.meters.find((meter) => meter.meterRef === rows[0]?.meterRef)?.unit;
  if (!unit) return [];
  return meterSeries(rows, rows[0]!.meterRef)
    .map((row, index, series) => ({
      ...row,
      date: meterDate(row.at, lang),
      amount: meterValue(row.value, unit, lang),
      usage: index === 0 ? undefined : meterUsage(row, series[index - 1]!, unit, lang),
    }))
    .reverse();
}

export function readMeters(raw: unknown, state: StateName, lang?: string): string[] {
  if (state !== "filled") return [];
  const input = raw as ReadInput;
  const { meters: words } = propertyWordsFor(lang);
  if (input.style === "register")
    return [
      words.register,
      ...input.meters.map((meter, index) => {
        const series = meterSeries(input.readings, meter.meterRef);
        const { latest, previous, usage } = meterSummary(series, meter.unit, lang);
        return [
          `r${index + 1}`,
          meter.title,
          latest ? words.latest(latest) : words.noReadings,
          input.detail === "full" && previous,
          usage,
        ]
          .filter(Boolean)
          .join(" · ");
      }),
      words.add,
    ];
  const rows = historyRows(input, lang);
  return [
    words.history,
    ...input.meters.map((meter) => meter.title),
    ...(rows.length
      ? rows.map((row) =>
          [row.id, row.date, row.amount, row.usage, row.photo && words.photo].filter(Boolean).join(" · "),
        )
      : [words.noReadings]),
    words.add,
  ];
}
