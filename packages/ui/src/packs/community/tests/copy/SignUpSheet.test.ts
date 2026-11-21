import { expect, it } from "vitest";
import { projectSignUp, signUpRecordKind, signUpRowCopy, validSignUpClaims } from "../../copy";

const slot = { id: "r1", slotId: "tables", capacity: 2 };
const ana = { slotId: "tables", memberId: "ana" };
const lee = { slotId: "tables", memberId: "lee" };
const seed = { slots: [slot], claims: [ana] };
const snapshot = {
  instance: "s1",
  viewer: "lee",
  claims: [ana, lee],
  members: [
    { id: "ana", name: "Ana Park", active: true },
    { id: "lee", name: "Lee Singh", active: false },
  ],
};
const projected = (...records: unknown[]) => projectSignUp(seed, "s1", { [signUpRecordKind]: records });

it("keeps a former member's release available for their own claim only", () => {
  expect(projected(snapshot).slots).toEqual([
    { ...slot, claimants: ["Ana Park", "Lee Singh"], can_claim: false, own_claim: true },
  ]);
  expect(projected({ ...snapshot, viewer: "outsider" }).slots[0]).toMatchObject({
    can_claim: false,
    own_claim: false,
  });
});

it("falls back to read-only seed claims when a matching host record is ambiguous or invalid", () => {
  for (const records of [
    [],
    [{ ...snapshot, instance: "s2" }],
    [snapshot, snapshot],
    [{ ...snapshot, members: [snapshot.members[0]] }],
    [{ ...snapshot, claims: [ana, ana] }],
  ]) {
    expect(projected(...records).slots).toEqual([
      { ...slot, claimants: ["ana"], can_claim: false, own_claim: false },
    ]);
  }
  expect(validSignUpClaims([{ id: slot.slotId, capacity: 1 }], [ana, lee])).toBe(false);
});

it("formats visible counts and claimant lists with the active language", () => {
  const row = projected(snapshot).slots[0]!;
  expect(signUpRowCopy(row, "full")).toMatchObject({
    claimants: "Ana Park and Lee Singh",
    remaining: "Full",
  });
  expect(signUpRowCopy(row, "brief").claimants).toBeUndefined();
  expect(signUpRowCopy({ ...row, expanded: true }, "brief", "en-GB").claimants).toBe(
    "Ana Park and Lee Singh",
  );
  const empty = { ...row, claimants: [], own_claim: false };
  expect(signUpRowCopy(empty, "full")).toMatchObject({
    remaining: "2 places left",
    claimants: "No one signed up yet",
  });
  expect(signUpRowCopy(empty, "full", "ar-EG")).toMatchObject({
    capacity: "٠/٢",
    remaining: "٢ places left",
  });
});
