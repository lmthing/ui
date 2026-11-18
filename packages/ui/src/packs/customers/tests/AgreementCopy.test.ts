import { expect, it } from "vitest";
import { agreementDateLine, agreementLabels } from "../copy";

it("labels consent and the stored signing date without domain content", () => {
  expect(agreementLabels).toEqual({ agree: "I agree", accepted: "Accepted", name: "Full name" });
  expect(agreementDateLine("2026-11-18")).toBe("Signed · 2026-11-18");
});
