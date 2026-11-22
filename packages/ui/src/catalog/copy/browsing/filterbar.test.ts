import { describe, expect, it } from "vitest";
import { filterCount, filterReading } from "./filterbar";

const room = { label: "Room", options: ["Kitchen", "Study"], value: "Study" };
const light = { id: "r4", label: "Light", options: ["Bright", "Indirect"] };

describe("FilterBar copy", () => {
  it("counts only applied field filters and localizes numbers", () => {
    expect(filterCount([light])).toBe("0 active filters");
    expect(filterCount([room, light])).toBe("1 active filter");
    expect(filterCount([room, { ...light, value: "Bright" }], "ar-EG")).toBe("٢ active filters");
  });

  it("reads available choices in address order and omits the count in brief detail", () => {
    const filters = [room, light];
    expect(filterReading({ filters, detail: "full", sort: "Recently watered" })).toEqual([
      "1 active filter",
      "Sort: Recently watered",
      "Clear filters",
      "r1 Room: Study (Kitchen · Study)",
      "r4 Light (Bright · Indirect)",
    ]);
    expect(filterReading({ filters, detail: "brief" })).toEqual([
      "Clear filters",
      "r1 Room: Study (Kitchen · Study)",
      "r4 Light (Bright · Indirect)",
    ]);
  });
});
