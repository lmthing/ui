import { expect, it } from "vitest";
import { isRecordArrival, receiptPose } from "./record-arrival";

it("only recognizes actual acknowledgement of the same record in both roles", () => {
  const identity = { reference: "TROT-92", fromRole: "Walker", toRole: "Dispatch" };
  const waiting = receiptPose({ ...identity, phase: "waiting" });
  const received = receiptPose({ ...identity, phase: "received" });
  const returned = receiptPose({ ...identity, phase: "returned" });
  expect(isRecordArrival(waiting, received)).toBe(true);
  expect(isRecordArrival(undefined, received)).toBe(false);
  expect(isRecordArrival(waiting, waiting)).toBe(false);
  expect(isRecordArrival(received, received)).toBe(false);
  expect(isRecordArrival(waiting, returned)).toBe(false);
  expect(isRecordArrival(returned, received)).toBe(false);
  expect(
    isRecordArrival(waiting, receiptPose({ ...identity, reference: "TROT-93", phase: "received" })),
  ).toBe(false);
  expect(isRecordArrival(waiting, receiptPose({ ...identity, toRole: "Owner", phase: "received" }))).toBe(
    false,
  );
  expect(receiptPose({ reference: "TROT-92", phase: "received" })).toBeUndefined();
});
