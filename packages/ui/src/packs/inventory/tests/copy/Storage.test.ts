import { describe, expect, it } from "vitest";
import { ancestorDestination, storageCount, storageReading } from "../../copy";

describe("Storage copy", () => {
  it("derives breadcrumb target slugs without colliding with reserved navigation ids", () => {
    expect(ancestorDestination("  Étage 2 ")).toBe("etage_2");
    expect(ancestorDestination("3 · Top shelf")).toBe("spot_3_top_shelf");
    expect(ancestorDestination("Back")).toBe("spot_back");
    expect(ancestorDestination("Sheet")).toBe("spot_sheet");
    expect(ancestorDestination("…")).toBeUndefined();
  });

  it("distinguishes a known empty spot from absent or malformed host snapshots", () => {
    const data = {
      storage_spots: [
        { goto: "broken", here: 8 },
        { goto: "empty", here: [] },
        { goto: "single", here: ["Towel"] },
        { goto: "full", here: ["Towel", "Lead"] },
      ],
    };
    expect(storageCount(data, "broken", "en")).toBeUndefined();
    expect(storageCount(data, "absent", "en")).toBeUndefined();
    expect(storageCount(data, "empty", "en")).toEqual({ digits: "0", unit: " items" });
    expect(storageCount(data, "single", "en")).toEqual({ digits: "1", unit: " item" });
    expect(storageCount(data, "full", "ar-EG")).toEqual({ digits: "٢", unit: " items" });
  });

  it("keeps child addresses and names in the reading while brief detail hides counts", () => {
    const input = { path: ["Workshop"], spots: [{ name: "Drawer", goto: "drawer" }], here: [] };
    const data = { storage_spots: [{ goto: "drawer", here: ["Wrench"] }] };
    expect(storageReading({ ...input, detail: "full" }, "en", data)).toContain('r2 "Drawer" 1 item');
    expect(storageReading({ ...input, detail: "brief" }, "en", data)).toEqual([
      'r1 "Workshop"',
      "Storage spots",
      'r2 "Drawer"',
      "Stored here",
      "Nothing stored here",
    ]);
  });
});
