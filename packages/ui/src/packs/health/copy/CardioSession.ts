import { clockLine, localeOf, numberLine, type StateName } from "../../../catalog";
import { healthWordsFor, type HealthWords } from "../lang";

type Words = HealthWords["cardio"];
type Split = { label: string; seconds: number; elevationDelta?: number | undefined };
type Session = {
  activity: keyof Words["activity"];
  elapsedSeconds: number;
  distance: number;
  unit: "km" | "mi";
  elevation?: number | undefined;
  hrAvg?: number | undefined;
  hrZone?: number | undefined;
  detail?: "full" | "brief" | undefined;
  splits: readonly Split[];
  style: "summary" | "live";
  live: boolean;
  running?: boolean;
};
type MetricPart = "distance" | "pace" | "elevation" | "heart" | "zone";

export function cardioControls(p: Pick<Session, "style" | "live" | "elapsedSeconds" | "running">) {
  const enabled = p.style === "live",
    running = p.running ?? p.live;
  const started = p.live || running || p.elapsedSeconds > 0;
  return {
    canStart: enabled && !started,
    canPause: enabled && running,
    canResume: enabled && started && !running,
    canLap: enabled && running,
    canFinish: enabled && started,
  };
}

export function cardioMetrics(p: Session, lang?: string) {
  const w = healthWordsFor(lang).cardio;
  const number = (value: number, maximumFractionDigits: number) =>
    new Intl.NumberFormat(localeOf(lang), { maximumFractionDigits }).format(value);
  const metrics: { part: MetricPart; label: string; value: string }[] = [];
  const add = (part: MetricPart, label: string, value: string) => metrics.push({ part, label, value });
  add("distance", w.distance, w.distanceValue(number(p.distance, 2), p.unit));
  if (p.distance > 0 && p.elapsedSeconds > 0) {
    if (p.activity === "ride")
      add("pace", w.speed, w.speedValue(number(p.distance / (p.elapsedSeconds / 3600), 1), p.unit));
    else add("pace", w.pace, w.paceValue(clockLine(Math.round(p.elapsedSeconds / p.distance), lang), p.unit));
  }
  if (p.hrAvg !== undefined) add("heart", w.heart, w.heartValue(numberLine(p.hrAvg, lang)));
  if (p.detail !== "brief") {
    if (p.hrZone !== undefined) add("zone", w.zone, numberLine(p.hrZone, lang));
    if (p.elevation !== undefined)
      add("elevation", w.elevation, w.elevationValue(numberLine(p.elevation, lang)));
  }
  return metrics;
}

export function cardioSplits<S extends Split>(
  p: { splits: readonly S[]; detail?: Session["detail"] },
  lang?: string,
) {
  const w = healthWordsFor(lang).cardio;
  const fastest = Math.min(...p.splits.map(({ seconds }) => seconds));
  const format = new Intl.NumberFormat(localeOf(lang), { signDisplay: "exceptZero" });
  return p.splits.map((split) => ({
    ...split,
    duration: clockLine(Math.round(split.seconds), lang),
    ratio: fastest / split.seconds,
    delta:
      p.detail === "brief" || split.elevationDelta === undefined
        ? undefined
        : w.elevationValue(format.format(split.elevationDelta)),
  }));
}

export function cardioReading(p: Session, state: StateName, lang?: string): string[] {
  const w = healthWordsFor(lang).cardio;
  if (state === "error") return [w.error, w.errorDetail];
  if (state !== "filled" && state !== "success") return [];
  return [
    ...(state === "success" ? [w.saved] : []),
    w.activity[p.activity],
    w.line(w.elapsed, clockLine(p.elapsedSeconds, lang)),
    ...cardioMetrics(p, lang).map(({ label, value }) => w.line(label, value)),
    ...cardioSplits(p, lang).map(({ label, duration, delta }) => w.splitLine(label, duration, delta)),
  ];
}
