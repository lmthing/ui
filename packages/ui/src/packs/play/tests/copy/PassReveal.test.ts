import { expect, it } from "vitest";
import { passRevealCurtain } from "../../copy";

it("reads only the current name and a public prompt on the curtain", () => {
  expect(passRevealCurtain("Anna", "Your turn")).toEqual(["Anna", "Your turn"]);
  expect(passRevealCurtain("Anna")).toEqual(["Anna", "Pass the phone to this player"]);
  expect(passRevealCurtain(undefined, "Your turn")).toEqual([]);
});
