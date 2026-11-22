import { z } from "zod";
import * as c from "../../../catalog";
import { communityWordsFor } from "../lang";
import { ref } from "../seeds";

type Member = {
  id: string;
  memberId: string;
  roles: string[];
  joined?: string | undefined;
  ended?: string | undefined;
  photo?: string | undefined;
  votingRights: boolean;
  badge?: string | undefined;
  committee?: string | undefined;
};
const ledgerBalance = z.strictObject({ memberId: ref, outstanding: z.number().nonnegative() });
type HostFacts = { today: string; secretary: boolean };

/** Bind trusted authority and the local civil date; absent facts never offer an end action. */
export function membersProjection(facts?: (instance: string) => HostFacts | undefined) {
  return (input: c.Values, instance: string): c.Values => {
    const { members, detail } = input as { members: Member[]; detail: string };
    const host = facts?.(instance);
    return {
      members: members.map((row) => ({
        ...row,
        can_end:
          host?.secretary === true &&
          row.ended === undefined &&
          Boolean(row.joined && row.joined <= host.today),
        ...(detail === "brief" && {
          joined: undefined,
          ended: undefined,
          photo: undefined,
          roles: row.roles.slice(0, 1),
        }),
      })),
    };
  };
}

export function memberFacts(row: Member, data: c.DeviceData, lang?: string) {
  const { members: w } = communityWordsFor(lang);
  const balances = (data.member_dues ?? []).flatMap((record) => {
    const checked = ledgerBalance.safeParse(record);
    return checked.success && checked.data.memberId === row.memberId ? [checked.data.outstanding] : [];
  });
  const owed = balances.some((amount) => amount > 0);
  return {
    otherRoles:
      row.roles.length > 1 ? new Intl.ListFormat(c.localeOf(lang)).format(row.roles.slice(1)) : undefined,
    joined: row.joined && w.joined(c.appointmentDate(row.joined, lang)),
    ended: row.ended && w.ended(c.appointmentDate(row.ended, lang)),
    voting: row.votingRights ? w.voting.yes : w.voting.no,
    badge: row.badge,
    committee: row.committee && w.committee(row.committee),
    dues: balances.length
      ? { tone: owed ? ("warn" as const) : ("good" as const), label: owed ? w.dues.owed : w.dues.paid }
      : undefined,
  };
}

export function memberReading(input: unknown, state: c.StateName, lang?: string, data: c.DeviceData = {}) {
  if (state !== "filled") return [];
  return (input as { members: Member[] }).members.map((row) => {
    const { otherRoles, joined, ended, voting, badge, committee, dues } = memberFacts(row, data, lang);
    return `${row.id}: ${[row.roles[0], otherRoles, joined, ended, voting, badge, committee, dues?.label].filter(Boolean).join(" · ")}`;
  });
}

export function previewMemberDues({ input }: { input: Readonly<c.Values> }): c.DeviceData {
  return {
    member_dues: (input.members as Member[]).map((row, index) => ({
      memberId: row.memberId,
      outstanding: index === 0 ? 0 : 12,
    })),
  };
}
