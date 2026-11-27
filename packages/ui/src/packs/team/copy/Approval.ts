import { z } from "zod";
import { compactMoneyLine, numberLine, text, type DeviceData, type Values } from "../../../catalog";
import { teamWordsFor, type TeamWords } from "../lang";

type Request = {
  kind: keyof TeamWords["approval"]["kinds"];
  amount?: number | undefined;
  status?: keyof TeamWords["approval"]["statuses"] | undefined;
  reference?: string | undefined;
  feedback?: Feedback | undefined;
};

const decisionReceipt = z.strictObject({
  reference: text(24),
  status: z.enum(["submitting", "failed", "approved", "declined"]),
});
type DecisionReceipt = z.infer<typeof decisionReceipt>;
type Feedback = "submitting" | "failed" | "unavailable";

function approvalReceipts(data: DeviceData) {
  const receipts = new Map<string, DecisionReceipt["status"] | undefined>();
  const snapshot = data.approvalDecisions;
  if (!Array.isArray(snapshot)) return receipts;
  for (const input of snapshot) {
    const parsed = decisionReceipt.safeParse(input);
    if (!parsed.success) continue;
    const { reference, status } = parsed.data;
    receipts.set(reference, receipts.has(reference) ? undefined : status);
  }
  return receipts;
}

export function approvalRevision(row: Readonly<Values>) {
  const { reference, from, kind, title, dates, amount, note, status } = row;
  return JSON.stringify([reference, from, kind, title, dates, amount, note, status ?? "pending"]);
}

export function projectApprovalRequests<T extends Request>(requests: readonly T[], data: DeviceData) {
  const receipts = approvalReceipts(data);
  const references = new Map<string, number>();
  for (const { reference } of requests)
    if (reference) references.set(reference, (references.get(reference) ?? 0) + 1);
  return requests.map((row) => {
    const pending = approvalOpen(row.status);
    const reference = row.reference && references.get(row.reference) === 1 ? row.reference : undefined;
    const received = reference && pending ? receipts.get(reference) : undefined;
    const feedback: Feedback | undefined =
      pending && (!reference || (receipts.has(reference) && received === undefined))
        ? "unavailable"
        : received === "submitting" || received === "failed"
          ? received
          : undefined;
    const status = received === "approved" || received === "declined" ? received : row.status;
    return {
      ...row,
      status,
      feedback,
      open: approvalOpen(status) && feedback !== "submitting" && feedback !== "unavailable",
    };
  });
}

export function approvalPortrait(from: string, photo: string) {
  return photo === "lib:people" ? { initials: Array.from(from).slice(0, 1).join("") } : { photo };
}

export function approvalAmount(amount: number | undefined, lang?: string) {
  return amount === undefined ? undefined : compactMoneyLine(amount, undefined, lang);
}

export function approvalOpen(status: Request["status"]): status is "pending" | undefined {
  return status === undefined || status === "pending";
}

export function approvalStatus(status: Request["status"], words: TeamWords["approval"], feedback?: Feedback) {
  if (feedback === "submitting") return { label: words.submitting, tone: "warn" as const };
  if (feedback === "failed") return { label: words.failed, tone: "bad" as const };
  if (feedback === "unavailable") return { label: words.unavailable, tone: "muted" as const };
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
  const rows = requests.map(({ kind, amount, status, feedback }, index) => {
    const heading = `r${numberLine(index + 1, lang)} ${kinds[kind]}`;
    const value = approvalAmount(amount, lang);
    const outcome = approvalStatus(status, words, feedback);
    return [heading, value, outcome.label].filter((line) => line !== undefined).join(detailSeparator);
  });
  return decisions &&
    style !== "my_requests" &&
    requests.some(
      ({ status, feedback }) =>
        approvalOpen(status) && feedback !== "submitting" && feedback !== "unavailable",
    )
    ? [...rows, approve, decline]
    : rows;
}
