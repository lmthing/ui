import { expect, it } from "vitest";
import { rewardLabels } from "../../copy";

it("keeps reward balances, costs and confirming claim copy unchanged", () => {
  expect(rewardLabels).toEqual({ points: "points", cost: "cost", claim: "Claim prize" });
});
