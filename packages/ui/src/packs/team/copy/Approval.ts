import { compactMoneyLine, numberLine } from "../../../catalog";
import { teamWordsFor, type TeamWords } from "../lang";

type Request = {
  kind: keyof TeamWords["approval"]["kinds"];
  amount?: number | undefined;
  status?: keyof TeamWords["approval"]["statuses"] | undefined;
};

export function approvalPortrait(from: string, photo: string) {
  return photo === "lib:people" ? { initials: Array.from(from).slice(0, 1).join("") } : { photo };
}

export function approvalAmount(amount: number | undefined, lang?: string) {
  return amount === undefined ? undefined : compactMoneyLine(amount, undefined, lang);
}

export function approvalOpen(status: Request["status"]): status is "pending" | undefined {
  return status === undefined || status === "pending";
}

export function approvalStatus(status: Request["status"], words: TeamWords["approval"]) {
  return approvalOpen(status)
    ? { label: words.awaitingDecision, tone: "muted" as const }
    : { label: words.statuses[status], tone: status === "approved" ? ("good" as const) : ("bad" as const) };
}

export function approvalReading(
  { requests, style }: { requests: readonly Request[]; style?: string },
  lang?: string,
  decisions = true,
) {
  const words = teamWordsFor(lang).approval;
  const { kinds, approve, decline, detailSeparator } = words;
  const rows = requests.map(({ kind, amount, status }, index) => {
    const heading = `r${numberLine(index + 1, lang)} ${kinds[kind]}`;
    const value = approvalAmount(amount, lang);
    const outcome = approvalStatus(status, words);
    return [heading, value, outcome.label].filter((line) => line !== undefined).join(detailSeparator);
  });
  return decisions && style !== "my_requests" && requests.some(({ status }) => approvalOpen(status))
    ? [...rows, approve, decline]
    : rows;
}
