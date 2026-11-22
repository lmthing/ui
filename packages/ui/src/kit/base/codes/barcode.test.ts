import { expect, it } from "vitest";
import { barcodeDrawing } from "./barcode";

function modules(value: string) {
  const drawing = barcodeDrawing(value, 168)!;
  const bits = Array<string>(drawing.side).fill("0");
  for (const [, x, width] of drawing.path.matchAll(/M(\d+) 0h(\d+)v\d+h-\d+z/g))
    bits.fill("1", Number(x), Number(x) + Number(width));
  return bits.join("");
}

it("draws Code 128 B with Start B, A, checksum 34, Stop and both quiet zones", () => {
  expect(modules("A")).toBe(
    "0000000000" + "11010010000" + "10100011000" + "10001011000" + "1100011101011" + "0000000000",
  );
});

it("draws Code 128 C with Start C, 12, checksum 14 and Stop", () => {
  expect(modules("12")).toBe(
    "0000000000" + "11010011100" + "10110011100" + "10011001110" + "1100011101011" + "0000000000",
  );
});

it("rejects missing, unsupported and too-wide values without silently encoding them as QR", () => {
  for (const value of [undefined, "", "a\n", "é", "abcdefghijk", "1234567890123456789012"])
    expect(barcodeDrawing(value, 168)).toBeUndefined();
  expect(barcodeDrawing("abcdefghij", 168)?.side).toBe(165);
  expect(barcodeDrawing("12345678901234567890", 168)?.side).toBe(165);
});
