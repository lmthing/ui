import * as c from "../../../catalog";
import { communityWordsFor } from "../lang";

type Decision = { id: string; title: string; text: string; voteId?: string | undefined };
type FollowUp = {
  id: string;
  text: string;
  decisionId: string;
  ownerId: string;
  due?: string | undefined;
  done: boolean;
};
export type MinutesRow = { id: string; visible: boolean } & (
  | (Decision & { kind: "decision"; showText: boolean; linked: boolean; goto?: string | undefined })
  | (FollowUp & { kind: "action"; decisionTitle: string; can_check: boolean; overdue: boolean })
);
type Header = {
  date: string;
  chairId: string;
  approvedBy?: string | undefined;
  approvedAt?: string | undefined;
};
type Document = Header & {
  approved: boolean;
  decisions: Decision[];
  entries: MinutesRow[];
  can_approve: boolean;
};
type Motion = { goto: string; closed: boolean; cancelled: boolean };
type Host = {
  viewer: string;
  today: string;
  secretary?: boolean;
  motion: (voteId: string) => Motion | undefined;
};

/** The showcase's seed link is navigation only. Authoritative hosts resolve it against a frozen motion. */
export function minutesProjection(hostFor?: (instance: string) => Host | undefined) {
  return (input: c.Values, instance: string): c.Values => {
    const { approved, chairId, decisions, entries } = input as Document;
    const host = hostFor?.(instance);
    const titles = new Map(decisions.map(({ id, title }) => [id, title]));
    return {
      can_approve: host !== undefined && host.viewer === chairId && !approved,
      entries: entries.map((row): MinutesRow => {
        if (row.kind === "decision") {
          const motion = row.voteId ? host?.motion(row.voteId) : undefined;
          const goto = hostFor ? (motion?.closed && !motion.cancelled ? motion.goto : undefined) : row.voteId;
          return { ...row, linked: Boolean(goto), goto };
        }
        return {
          ...row,
          decisionTitle: titles.get(row.decisionId)!,
          can_check: Boolean(host && (host.viewer === row.ownerId || host.secretary)),
          overdue: Boolean(!row.done && row.due && host && row.due < host.today),
        };
      }),
    };
  };
}

const memberName = (id: string, lang?: string) =>
  id.charAt(0).toLocaleUpperCase(c.localeOf(lang)) + id.slice(1).replaceAll("_", " ");

export function minutesHeader(input: Header, lang?: string) {
  const w = communityWordsFor(lang).minutes;
  const { date, chairId, approvedAt, approvedBy } = input;
  const approvalDate = approvedAt && new Date(approvedAt).toISOString().slice(0, 10);
  return {
    date: c.appointmentDate(date, lang),
    chair: w.chair(memberName(chairId, lang)),
    approval:
      approvedBy && approvalDate
        ? w.approval(memberName(approvedBy, lang), c.appointmentDate(approvalDate, lang))
        : w.draft,
  };
}

export function minutesRowCopy(row: MinutesRow, lang?: string) {
  const w = communityWordsFor(lang).minutes;
  if (row.kind === "decision")
    return {
      title: row.title,
      text: row.showText ? row.text : undefined,
      action: row.linked && w.motion,
    } as const;
  return {
    title: row.text,
    decision: row.decisionTitle,
    owner: w.owner(memberName(row.ownerId, lang)),
    due: row.due && (row.overdue ? w.overdue : w.due)(c.appointmentDate(row.due, lang)),
    status: row.done ? w.complete : w.incomplete,
  } as const;
}

export function minutesReading(input: unknown, state: c.StateName, lang?: string) {
  if (state !== "filled") return [];
  const doc = input as Document;
  const w = communityWordsFor(lang).minutes;
  const rows = doc.entries.filter((row) => row.visible);
  return [
    ...Object.values(minutesHeader(doc, lang)),
    ...(rows.some((row) => row.kind === "decision") ? [w.decisions] : []),
    ...(rows.some((row) => row.kind === "action") ? [w.actions] : []),
    ...rows.map(
      (row) => `${row.id}: ${Object.values(minutesRowCopy(row, lang)).filter(Boolean).join(" · ")}`,
    ),
    ...(doc.can_approve ? [w.approve] : []),
  ];
}
