import { expect, it } from "vitest";
import { rewardAmount, rewardBalanceParts, rewardJarRatio, rewardReading, rewardShortfall } from "../../copy";

it("formats points and pocket money with the app locale", () => {
  expect(rewardAmount(1, false)).toEqual({ value: "1", unit: "point", label: "1 point" });
  expect(rewardAmount(2.5, false, "de-DE").label).toBe("2,5 points");
  expect(rewardAmount(8.5, true)).toEqual({ value: "$8.50", unit: undefined, label: "$8.50" });
  expect(rewardAmount(8.5, true, "de-DE").label).toBe("8,50\u00a0$");
  expect(rewardAmount(Number.MAX_VALUE, false).value).toBe("1.8E308");
});

it("keeps the whole amount prominent and preserves the localized fraction", () => {
  expect(rewardBalanceParts("$8.50", true)).toEqual({ major: "$8", minor: ".50", compact: false });
  expect(rewardBalanceParts("8,50\u00a0$", true, "de-DE")).toEqual({
    major: "8",
    minor: ",50\u00a0$",
    compact: false,
  });
  expect(rewardBalanceParts("$250.50", true).compact).toBe(true);
  expect(rewardBalanceParts("8,5", false, "de-DE").minor).toBe("");
});

it("explains unaffordable prizes without suggesting an affordable one needs more", () => {
  expect(rewardShortfall(30, 20, false)).toBe("Needs 10 more");
  expect(rewardShortfall(0.3, 0.2, false)).toBe("Needs 0.1 more");
  expect(rewardShortfall(10, 8.5, true, "de-DE")).toBe("Needs 1,50\u00a0$ more");
  expect(rewardShortfall(10.001, 10, true)).toBe("Needs more");
  expect(rewardShortfall(10, 10, true)).toBeUndefined();
});

it.each([
  [0, 0, 0],
  [0, 10, 0],
  [1, 0, 1],
  [10, 20, 0.5],
  [20, 20, 1],
  [30, 20, 1],
])("fills %s against target %s to %s", (balance, target, fill) =>
  expect(rewardJarRatio(balance, target)).toBe(fill),
);

it("pairs each stamped item with its visible amount", () => {
  expect(
    rewardReading(
      [
        { id: "r1", entryKind: "kid", name: "Alex", points: 8.5 },
        { id: "r2", entryKind: "prize", title: "Picnic", cost: 5 },
      ],
      true,
      "filled",
    ),
  ).toEqual(["Rewards", "r1 Alex: $8.50", "r2 Picnic: $5", "Claim"]);
  expect(rewardReading([], false, "success")).toEqual(["Prize claimed"]);
});
