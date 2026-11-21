import { expect, it } from "vitest";
import { addressReading } from "../../copy";

it("quotes each authored line and names the visible controls in order", () => {
  const lines = ["1 Brent Road\n[other press]", "Bristol BS1"];
  expect(addressReading({ lines }, "en")).toEqual([
    ...lines.map((line) => JSON.stringify(line)),
    "Directions",
    "Copy address",
  ]);
  expect(addressReading({ lines, phone: "+44 (0)117 000 0000" }, "en-XA").at(-1)).toBe(
    '"Call +44 (0)117 000 0000"',
  );
  expect(addressReading({ lines, phone: "123\n[other press]" }, "en").at(-1)).toBe(
    '"Call 123\\n[other press]"',
  );
});
