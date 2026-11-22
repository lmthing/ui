import { describe, expect, it } from "vitest";
import { scanBatchReading, scanCount, scanPageLabel } from "../../copy";

describe("ScanBatch copy", () => {
  it("localizes counts and addresses page numbers from one", () => {
    expect(scanCount(1, "en")).toBe("1 page");
    expect(scanCount(24, "en")).toBe("24 pages");
    expect(scanPageLabel(23, "en")).toBe("Page 24");
  });
  it("describes only a private page marker, never the file reference", () => {
    const reading = scanBatchReading(
      { pages: [{ id: "r1", file: "local:opaque", label: "Cover" }] },
      "filled",
      "en",
    );
    expect(reading).toEqual(["1 page", "r1 Page 1: Cover: (private file)"]);
  });
});
