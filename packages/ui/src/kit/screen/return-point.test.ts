import { expect, it } from "vitest";
import { arrivalAddress, popReturnPoint, returnIndex } from "./return-point";

it("returns to the last matching origin and leaves its parent history intact", () => {
  const first = { from: "root", to: "list", address: "root/nav/section", top: 36 };
  const second = { from: "list", to: "detail", address: "list/records/r2/root", top: 152 };
  const history = [first, second];
  expect(returnIndex(history, "detail", "list")).toBe(1);
  expect(popReturnPoint(history, "detail", "list")).toEqual(second);
  expect(history).toEqual([first]);
  expect(popReturnPoint(history, "list", "root")).toEqual(first);
  expect(history).toEqual([]);
});

it("does not restore a record from a different route", () => {
  const history = [{ from: "root", to: "list", address: "root/nav/section", top: 36 }];
  expect(popReturnPoint(history, "detail", "root")).toBeUndefined();
  expect(history).toEqual([]);
});

it("picks the destination's addressed heading rather than its Back action", () => {
  expect(arrivalAddress({ id: "detail", components: [{ id: "heading", c: "Header" }] })).toBe(
    "detail/heading/title",
  );
  expect(arrivalAddress({ id: "empty", components: [] })).toBeUndefined();
});
