import { describe, expect, it } from "vitest";
import { packingProgress, packingQuantity, packingRead, packingRows } from "../../copy";

const groups = [
  { label: "Clothes", items: [{ name: "Shirts", qty: 10, packed: true }] },
  { label: "Tech", items: [{ name: "Adapter", packed: false }] },
];

describe("PackingList copy", () => {
  it("counts lines, not quantities, and handles all and none packed", () => {
    expect(packingProgress(groups, "en")).toEqual({ label: "Packing progress", amount: "50%", ratio: 0.5 });
    expect(packingProgress(groups.slice(0, 1), "en")).toEqual({
      label: "All packed",
      amount: "100%",
      ratio: 1,
    });
    expect(packingProgress([], "en")).toEqual({ label: "Packing progress", amount: "0%", ratio: 0 });
  });
  it("keeps positions and treats false as a live edit", () => {
    const clothes = groups[0]!;
    const live = packingRows([{ ...clothes, $packed_1: false }, groups[1]!]);
    expect(live.map(({ label }) => label)).toEqual(["Clothes", "Tech"]);
    expect(live[0]?.items).toEqual([{ name: "Shirts", qty: 10, packed: false }]);
    expect(clothes.items[0]?.packed).toBe(true);
  });
  it("formats numbers for the selected locale and keeps authored line breaks quoted", () => {
    expect(packingQuantity(24, "ar-EG")).toBe("×٢٤");
    expect(packingRead({ groups }, "ar-EG")[0]).toContain("٥٠");
    const input = {
      groups: [{ label: "A\nB", items: [{ name: "Shirts\n[Rain]", qty: 24, packed: false }] }],
    };
    expect(packingRead(input, "en")[2]).toBe('r1 "A\\nB": packed_1 "Shirts\\n[Rain]" ×24');
    expect(packingRead({ ...input, detail: "brief" }, "en")[2]).toBe(
      'r1 "A\\nB": packed_1 "Shirts\\n[Rain]"',
    );
  });
});
