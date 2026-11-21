import type { StateName } from "../../../catalog";
import { requestsWordsFor, type RequestsWords } from "../lang";

type Words = RequestsWords["resolution"];
type Outcome = keyof Words["outcomes"];
type Reading = {
  style: "review" | "receipt";
  outcome: Outcome;
  outcome_choices: Outcome[];
  duplicateOf?: string;
  reason?: string | undefined;
  liveReason?: string;
  media: "thumb" | "none";
  photos: string[];
  checks: { text: string; done: boolean }[];
  canEdit: boolean;
  canResolve: boolean;
  canEnterReason: boolean;
  matched: boolean;
};

export function resolutionHeading(style: Reading["style"], state: StateName, w: Words) {
  if (state === "success") return w.accepted;
  if (state === "error") return w.error;
  return style === "review" ? w.proposal : w.receipt;
}

export function reviewBlocker(
  p: Pick<Reading, "canEdit" | "outcome" | "matched" | "liveReason" | "reason">,
  w: Words,
) {
  if (!p.canEdit) return w.staffOnly;
  if (p.outcome === "duplicate" && !p.matched) return w.duplicateMismatch;
  if ((p.outcome === "unable" || p.outcome === "duplicate") && !(p.liveReason ?? p.reason)?.trim())
    return w.reasonRequired;
  return w.workPending;
}

export function resolutionReading(input: unknown, state: StateName, lang?: string): string[] {
  const { resolution: w } = requestsWordsFor(lang);
  const p = input as Reading;
  const title = resolutionHeading(p.style, state, w);
  if (state === "error") return [title, w.errorHint];
  if (state !== "filled" && state !== "success") return [];
  const review = p.style === "review",
    accepted = state === "success";
  const editable = p.canEdit && !accepted;
  const enterReason = p.canEnterReason && (!review || !accepted);
  const reason = review
    ? editable
      ? (p.liveReason ?? p.reason)
      : p.reason
    : enterReason
      ? p.liveReason
      : undefined;
  const labels = [...new Set([p.outcome, ...p.outcome_choices])].map((value) => w.outcomes[value]);
  return [
    title,
    ...(editable ? [w.outcome, ...labels] : [w.result(w.outcomes[p.outcome])]),
    ...(p.outcome === "duplicate" && p.duplicateOf ? [w.duplicateOf(p.duplicateOf)] : []),
    ...(reason ? [reason] : []),
    ...(!review && p.reason ? [p.reason] : []),
    ...(p.media !== "none" && p.photos.length
      ? [w.evidence, ...p.photos.map((photo) => `photo:${photo.replace(/^lib:/, "")}`)]
      : []),
    w.verify,
    ...p.checks.map(({ text, done }) => w.checkLabel(text, done)),
    ...(review && !accepted ? [...(!p.canResolve ? [reviewBlocker(p, w)] : []), w.resolve] : []),
    ...(!review && !accepted && enterReason && p.checks.some(({ done }) => !done)
      ? [w.verificationPending]
      : []),
    ...(!review && !accepted ? [w.accept] : []),
    ...(enterReason ? (review ? [w.reason, w.reasonHint] : [w.reopenReason, w.reopenHint, w.reopen]) : []),
  ];
}
