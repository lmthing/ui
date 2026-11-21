import { compactMoneyLine, numberLine } from "../../../catalog";
import { teamWordsFor, type TeamWords } from "../lang";

type Request = { kind: keyof TeamWords["approval"]["kinds"]; amount?: number | undefined };

export function approvalPortrait(from: string, photo: string) {
  return photo === "lib:people" ? { initials: Array.from(from).slice(0, 1).join("") } : { photo };
}

export function approvalAmount(amount: number | undefined, lang?: string) {
  return amount === undefined ? undefined : compactMoneyLine(amount, undefined, lang);
}

export function approvalReading({ requests }: { requests: readonly Request[] }, lang?: string) {
  const { kinds, approve, decline, detailSeparator } = teamWordsFor(lang).approval;
  return [
    ...requests.map(({ kind, amount }, index) => {
      const value = approvalAmount(amount, lang);
      const heading = `r${numberLine(index + 1, lang)} ${kinds[kind]}`;
      return value === undefined ? heading : [heading, value].join(detailSeparator);
    }),
    approve,
    decline,
  ];
}
