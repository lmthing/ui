import { describe, expect, it } from "vitest";
import { affordancesOf, components, stampItemIds, readComponent } from "@lmthing/ui/catalog";
import { renderInstance } from "../../test/render";
const { props, meta } = components.Timeline;
const row = { time: "09:00", end: "10:00", title: "Water the fern", goto: "fern" };
const base = { style: "hours", items: [row] };
describe("Timeline hours", () => {
  it("orders ranges, keeps the hours weight and exposes only links", () => {
    const input = props.parse({
      style: "hours",
      items: [{ ...row, time: "12:00", end: "13:00", goto: undefined }, row],
    });
    expect(input.items.map((item) => item.time)).toEqual(["09:00", "12:00"]);
    expect(meta.weightByStyle.hours).toBe(3);
    expect(meta.signatureByStyle.hours).toBe("day_unfold");
    expect(affordancesOf(meta, stampItemIds(meta, input), "t1")).toEqual([
      { address: "t1/r1", part: "root", action: "press", detail: "→fern" },
    ]);
  });
  it.each([
    { ...base, items: [] },
    { ...base, items: Array.from({ length: 9 }, () => row) },
    { ...base, items: [{ ...row, time: "9:00" }] },
    { ...base, items: [{ ...row, end: "09:00" }] },
    { ...base, items: [{ ...row, end: "08:00" }] },
    { ...base, items: [{ ...row, end: undefined }] },
    { ...base, items: [{ ...row, end: "24:00" }] },
    { ...base, items: [{ ...row, title: "a".repeat(33) }] },
    { ...base, items: [{ ...row, meta: "Extra" }] },
    { ...base, items: [{ ...row, done: true }] },
    { ...base, items: [{ ...row, tone: "green" }] },
    { style: "day", items: [row] },
  ])("rejects invalid ranges and misplaced hour props", (input) =>
    expect(props.safeParse(input).success).toBe(false),
  );
  it("renders every allowed count with distinct parts and reads matching ranges", () => {
    for (let count = 1; count <= 8; count++) {
      const input = {
        style: "hours",
        items: Array.from({ length: count }, (_, index) => ({
          time: `${String(index + 8).padStart(2, "0")}:00`,
          end: `${String(index + 9).padStart(2, "0")}:00`,
          title: `Activity ${index + 1}`,
          ...(index % 2 === 0 ? { goto: "activity" } : {}),
        })),
      };
      const html = renderInstance("Timeline", input, "filled", {
        preset: "calm",
        mode: "light",
        accent: "moss",
      });
      expect(html.match(/data-testid="home\/c1\/root"/g)).toHaveLength(1);
      for (let index = 1; index <= count; index++)
        for (const part of ["root", "time", "title"])
          expect(html).toContain(`data-testid="home/c1/r${index}/${part}"`);
      expect(readComponent(components.Timeline, input, "t1").join("\n")).toContain("08:00–09:00");
    }
  });
});
