import { appointmentDate, numberLine } from "../../../catalog";
import { hiringWordsFor } from "../lang";
import { activeStages, outcomes } from "../seeds";

type Applicant = {
  name: string;
  stage: (typeof activeStages)[number];
  outcome: (typeof outcomes)[number];
  applied: string;
  next?: string | undefined;
  nextAt?: string | undefined;
};

export function applicantCopy({ applied, next, nextAt }: Applicant, lang?: string) {
  const { applications } = hiringWordsFor(lang);
  return {
    applied: applications.applied(appointmentDate(applied, lang)),
    next,
    nextAt: nextAt && applications.nextAt(appointmentDate(nextAt, lang)),
  };
}

export function pipelineOutcomes(rows: readonly Applicant[]) {
  return outcomes
    .filter((outcome) => outcome !== "active")
    .map((outcome) => ({
      outcome,
      count: rows.filter((row) => row.outcome === outcome).length,
    }));
}

export function pipelineCopy<T extends Applicant>(
  rows: readonly T[],
  closed: ReturnType<typeof pipelineOutcomes>,
  lang?: string,
) {
  const words = hiringWordsFor(lang);
  const active = rows.filter(({ outcome }) => outcome === "active");
  const outcomeLines = closed.map(({ outcome, count }) => ({
    id: outcome,
    label: words.pipeline.countLabel(words.outcomes[outcome]),
    count: numberLine(count, lang),
  }));
  return {
    active,
    columns: activeStages.map((id) => {
      const count = active.filter(({ stage }) => stage === id).length;
      return {
        id,
        label: words.stages[id],
        moveLabel: words.stages[id],
        count: numberLine(count, lang),
        empty: count === 0,
      };
    }),
    outcomeLines,
    outcomes: outcomeLines.map(({ label, count }) => label + count).join(words.pipeline.separator),
  };
}

export function pipelineReading(
  rows: readonly Applicant[],
  closed: ReturnType<typeof pipelineOutcomes>,
  lang?: string,
) {
  const { pipeline } = hiringWordsFor(lang);
  const { active, columns, outcomes: summary } = pipelineCopy(rows, closed, lang);
  return [
    ...columns.map(({ label, count }) => pipeline.count(label, count)),
    summary,
    ...(columns.some(({ empty }) => empty) ? [pipeline.emptyStage] : []),
    ...(active.length ? [pipeline.move] : []),
    ...columns.filter(({ id }) => active.some(({ stage }) => stage !== id)).map(({ moveLabel }) => moveLabel),
    ...active.flatMap((row) => {
      const { applied, next, nextAt } = applicantCopy(row, lang);
      return [row.name, applied, ...(next ? [next] : []), ...(nextAt ? [nextAt] : [])];
    }),
  ];
}
