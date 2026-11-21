import { expect, it } from "vitest";
import { buzzerPadReady } from "../../copy";

it("keeps the armed status whether or not the host writes a prompt", () => {
  expect(buzzerPadReady("Name the clue")).toEqual(["Name the clue", "Ready to buzz"]);
  expect(buzzerPadReady()).toEqual(["Ready to buzz"]);
});
