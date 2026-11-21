import { expect, it } from "vitest";
import { filePagesLine, fileSizeLine, maskedPassId, passExpiryLine } from ".";

it("formats sizes in decimal units without a long value at either extreme", () => {
  expect(fileSizeLine(0)).toBe("0 byte");
  expect(fileSizeLine(999)).toBe("999 byte");
  expect(fileSizeLine(1000)).toBe("1 kB");
  expect(fileSizeLine(1_250_000)).toBe("1.3 MB");
  expect(fileSizeLine(1_500_000, "de")).toContain("1,5");
  expect(fileSizeLine(Number.MAX_VALUE)).toMatch(/E\d+ PB$/);
});

it("localizes dates, page counts and the ID mask", () => {
  expect(filePagesLine(1)).toBe("1 page");
  expect(filePagesLine(12)).toBe("12 pages");
  expect(passExpiryLine("2027-09-30")).toBe("Expires 30 Sept 2027");
  expect(maskedPassId("1234")).toBe("••••");
  expect(maskedPassId("DEMO-0642")).toBe("•••• 0642");
  expect(maskedPassId("DEMO-🌱123")).toBe("•••• 🌱123");
});
