import { z } from "zod";
import * as c from "../../../catalog";
import { communityWordsFor } from "../lang";
import { distinct, ref } from "../seeds";

export const signUpClaim = z.strictObject({ slotId: ref, memberId: ref });
const signUpRecordKind = "community_signups";
export { signUpRecordKind };
const preview = Symbol("signUpPreview");
const hostRecord = z.object({
  instance: c.screenId,
  viewer: ref.optional(),
  members: z.array(z.object({ id: ref, name: c.text(24), active: z.boolean() })),
  claims: z.array(signUpClaim),
});

type Claim = z.output<typeof signUpClaim>;
type Slot = { id: string; slotId: string; capacity: number; expanded?: boolean };
type Sheet = { slots: Slot[]; claims: Claim[]; detail: "full" | "brief" };
export type SignUpRow = Slot & { claimants: string[]; can_claim: boolean; own_claim: boolean };

export function validSignUpClaims(slots: readonly { id: string; capacity: number }[], claims: Claim[]) {
  if (!distinct(claims, ({ slotId, memberId }) => `${slotId}/${memberId}`)) return false;
  const spots = new Map(slots.map(({ id, capacity }) => [id, capacity]));
  for (const { slotId } of claims) {
    const left = spots.get(slotId);
    if (!left) return false;
    spots.set(slotId, left - 1);
  }
  return true;
}

function matchingRecord(slots: Slot[], instance: string, data: c.DeviceData) {
  const matches = data[signUpRecordKind]?.filter(
    (row): row is { instance: string; [preview]?: true } =>
      !!row &&
      typeof row === "object" &&
      (("instance" in row && row.instance === instance) || (preview in row && row[preview] === true)),
  );
  if (matches?.length !== 1) return;
  const checked = hostRecord.safeParse(matches[0]);
  if (!checked.success) return;
  const { claims, members } = checked.data;
  if (
    !validSignUpClaims(
      slots.map(({ slotId, capacity }) => ({ id: slotId, capacity })),
      claims,
    )
  )
    return;
  const roster = new Map(members.map((member) => [member.id, member]));
  if (roster.size !== members.length || claims.some(({ memberId }) => !roster.has(memberId))) return;
  return { ...checked.data, roster };
}

export function projectSignUp(input: Readonly<c.Values>, instance: string, data: c.DeviceData) {
  const { slots, claims } = input as Sheet;
  const host = matchingRecord(slots, instance, data);
  const viewer = host?.viewer && host.roster.get(host.viewer);
  return {
    slots: slots.map((row): SignUpRow => {
      const claimed = (host?.claims ?? claims).filter(({ slotId }) => slotId === row.slotId);
      const own_claim = !!viewer && claimed.some(({ memberId }) => memberId === viewer.id);
      return {
        ...row,
        claimants: claimed.map(({ memberId }) => host?.roster.get(memberId)?.name ?? memberId),
        can_claim: !!viewer && viewer.active && !own_claim && claimed.length < row.capacity,
        own_claim,
      };
    }),
  };
}

/** Preview a member who has a place on one row and can claim a place on another. */
export function previewSignUp({ input }: { input: Readonly<c.Values> }): c.DeviceData {
  const { claims } = input as Sheet;
  const viewer = claims.length > 1 ? claims.at(-1)!.memberId : "preview_member";
  const ids = new Set([viewer, ...claims.map(({ memberId }) => memberId)]);
  return {
    [signUpRecordKind]: [
      {
        [preview]: true,
        instance: "preview",
        viewer,
        claims,
        members: [...ids].map((id) => ({
          id,
          active: true,
          name: id
            .split("_")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" "),
        })),
      },
    ],
  };
}

export function signUpStatus(state: c.StateName, lang?: string) {
  const words = communityWordsFor(lang).signUp;
  return state === "success" ? words.saved : state === "error" ? words.error : undefined;
}

export function signUpRowCopy(row: SignUpRow, detail: Sheet["detail"], lang?: string) {
  const words = communityWordsFor(lang).signUp;
  const remaining = row.capacity - row.claimants.length;
  return {
    capacity: words.capacity(c.numberLine(row.claimants.length, lang), c.numberLine(row.capacity, lang)),
    remaining: remaining
      ? words.remaining(c.numberLine(remaining, lang), c.pluralForm(remaining, lang))
      : words.full,
    claimants:
      detail === "full" || row.expanded
        ? new Intl.ListFormat(c.localeOf(lang)).format(row.claimants) || words.noClaimants
        : undefined,
    action: row.own_claim ? ("release" as const) : row.can_claim ? ("claim" as const) : undefined,
  };
}

export function signUpReading(input: unknown, state: c.StateName, lang?: string) {
  const { slots, detail } = input as { slots: SignUpRow[]; detail: Sheet["detail"] };
  const words = communityWordsFor(lang).signUp;
  const status = signUpStatus(state, lang);
  if (state !== "filled" && state !== "success") return status ? [status] : [];
  return [
    ...(status ? [status] : []),
    ...slots.map((row) => {
      const { capacity, remaining, claimants, action } = signUpRowCopy(row, detail, lang);
      const label = state === "filled" && action ? words[action] : undefined;
      return `${row.id}: ${[capacity, remaining, claimants, label].filter(Boolean).join(words.separator)}`;
    }),
  ];
}
