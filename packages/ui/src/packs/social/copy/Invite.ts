import { numberLine, pluralForm, type StateName } from "../../../catalog";
import { socialWordsFor } from "../lang";

type InviteCount = { joined?: number | undefined; detail: "full" | "brief" };
type InviteReading = InviteCount & { qr: boolean };

export function inviteJoinedLine({ joined, detail }: InviteCount, lang?: string) {
  if (joined === undefined || detail === "brief") return;
  return socialWordsFor(lang).invite.joined(numberLine(joined, lang), pluralForm(joined, lang));
}

export function inviteReading(input: unknown, state: StateName, lang?: string): string[] {
  if (state !== "filled") return [];
  const value = input as InviteReading;
  const words = socialWordsFor(lang).invite;
  const joined = inviteJoinedLine(value, lang);
  return [
    ...(joined === undefined ? [] : [joined]),
    ...(value.qr ? [words.qr] : []),
    words.copy,
    words.share,
  ];
}
