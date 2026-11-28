import { expect, it } from "vitest";
import { expireRecordArrival, isRecordArrival, matchesReceived, receiptPose } from "./record-arrival";

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

it("matches a scripted receipt only after acceptance and across the same parties and reference", () => {
  const cue = { component: "receipt", reference: "TROT-92", fromRole: "Walker", toRole: "Dispatch" };
  expect(matchesReceived(cue, receiptPose({ ...cue, phase: "received" }))).toBe(true);
  expect(matchesReceived(cue, receiptPose({ ...cue, phase: "waiting" }))).toBe(false);
  expect(matchesReceived(cue, receiptPose({ ...cue, phase: "returned" }))).toBe(false);
  expect(matchesReceived(cue, receiptPose({ ...cue, phase: "received", reference: "TROT-93" }))).toBe(false);
  expect(matchesReceived(cue, receiptPose({ ...cue, phase: "received", toRole: "Walker" }))).toBe(false);
});

it("cannot deliver a cue on a later accepted step once the destination commit spent it", () => {
  const cue = { component: "receipt", reference: "TROT-92", fromRole: "Walker", toRole: "Dispatch" };
  expect(matchesReceived(cue, receiptPose({ ...cue, phase: "waiting" }))).toBe(false);
  expireRecordArrival(cue);
  expect(matchesReceived(cue, receiptPose({ ...cue, phase: "received" }))).toBe(false);
});
