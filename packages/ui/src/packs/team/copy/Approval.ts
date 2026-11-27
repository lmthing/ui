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

export function approvalReading(
  { requests, style }: { requests: readonly Request[]; style?: string },
  lang?: string,
) {
  const { kinds, statuses, approve, decline, detailSeparator, awaitingDecision } =
    teamWordsFor(lang).approval;
  const own = style === "my_requests";
  const rows = requests.map(({ kind, amount, status }, index) => {
    const heading = `r${numberLine(index + 1, lang)} ${kinds[kind]}`;
    const value = approvalAmount(amount, lang);
    const outcome = approvalOpen(status) ? (own ? awaitingDecision : undefined) : statuses[status];
    return [heading, value, outcome].filter((line) => line !== undefined).join(detailSeparator);
  });
  return own || !requests.some(({ status }) => approvalOpen(status)) ? rows : [...rows, approve, decline];
}
