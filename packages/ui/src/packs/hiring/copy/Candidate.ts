import { dateFormatter } from "../../../catalog";
import { hiringWordsFor, type HiringWords } from "../lang";

type Application = {
  applied: string;
  stage: Exclude<keyof HiringWords["stages"], "saved">;
  outcome: keyof HiringWords["outcomes"];
};
type EvidenceReview = Application & {
  criteria: readonly {
    label: string;
    finding: Finding;
    panelFindings?: readonly PanelFinding[] | undefined;
  }[];
  detail?: "full" | "brief" | undefined;
  style?: "panel" | undefined;
  resumeGoto?: string | undefined;
};
type Finding = keyof HiringWords["candidate"]["findings"];
type PanelFinding = { interviewer: string; finding: Finding; evidence?: string | undefined };

export function panelFindingCopy(
  { interviewer, finding, evidence }: PanelFinding,
  detail: EvidenceReview["detail"],
  lang?: string,
) {
  return {
    interviewer,
    finding: hiringWordsFor(lang).candidate.findings[finding],
    evidence: detail === "brief" ? undefined : evidence,
  };
}

export function candidateCopy({ applied, stage, outcome }: Application, lang?: string) {
  const words = hiringWordsFor(lang);
  return {
    applied: words.candidate.applied(dateFormatter(lang).format(new Date(`${applied}T00:00:00Z`))),
    stage: words.stages[stage],
    outcome: words.outcomes[outcome],
  };
}

export function candidateReading(input: EvidenceReview, lang?: string) {
  const { applied, stage, outcome } = candidateCopy(input, lang);
  const { candidate } = hiringWordsFor(lang);
  return [
    applied,
    stage,
    outcome,
    ...input.criteria.flatMap(({ label, finding, panelFindings }) => [
      candidate.reviewLine(label, candidate.findings[finding]),
      ...(input.style === "panel" && panelFindings
        ? [
            candidate.panel,
            ...panelFindings.flatMap((row) => {
              const panel = panelFindingCopy(row, input.detail, lang);
              return [
                candidate.reviewLine(panel.interviewer, panel.finding),
                ...(panel.evidence ? [panel.evidence] : []),
              ];
            }),
          ]
        : []),
    ]),
    ...Object.values(candidate.findings),
    ...(input.resumeGoto ? [candidate.resume] : []),
    ...(input.outcome === "active"
      ? [candidate.interview, candidate.offer, candidate.hire, candidate.reject, candidate.withdraw]
      : Object.values(candidate.history)),
  ];
}
