import { expect, it } from "vitest";
import { barcodeModules } from "./barcode";

it("counts the complete Code 128 symbol and quiet zones without changing the source", () => {
  expect(barcodeModules(" 05120 ")).toEqual({ pairs: false, side: 132 });
  expect(barcodeModules("05120764")).toEqual({ pairs: true, side: 99 });
  expect(barcodeModules("012")).toEqual({ pairs: false, side: 88 });
  for (const invalid of [undefined, "", "é", "123\n"]) expect(barcodeModules(invalid)).toBeUndefined();
});
