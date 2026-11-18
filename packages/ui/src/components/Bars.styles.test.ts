import { describe, expect, it } from "vitest";
import { renderInstance } from "../../test/render";
import { components, percentLine, readComponent } from "@lmthing/ui/catalog";

const { props } = components.Bars;
const point = { label: "Mon", value: 3 };
const input = { title: "This week", points: [point, { label: "Tue", value: 5 }] };

function renderInput(input: unknown) {
  return renderInstance("Bars", input, "filled", { preset: "calm", mode: "light", accent: "moss" });
}
function renderPoints(count: number, state: "filled" | "empty" | "loading", unit?: string) {
  return renderInstance(
    "Bars",
    {
      title: "a".repeat(32),
      ...(unit ? { unit } : {}),
      points: Array.from({ length: count }, () => ({ label: "abcd", value: 0 })),
    },
    state,
    { preset: "calm", mode: "light", accent: "moss" },
  );
}

describe("Bars share", () => {
  const share = {
    style: "share",
    title: "Where it went",
    points: [
      { label: "Groceries", value: 3 },
      { label: "Rent", value: 1 },
    ],
  };
  it("takes long labels and reads each part's share of the whole", () => {
    expect(props.safeParse(share).success).toBe(true);
    const line = readComponent(components.Bars, share, "b1").join("\n");
    expect(line).toContain("Groceries 3 75%");
    expect(line).toContain("Rent 1 25%");
    expect(percentLine(0, 0)).toBe("0%");
  });
  it("draws one item per part with its label and a legend row", () => {
    const html = renderInput(share);
    for (const index of [1, 2]) {
      expect(html).toContain(`data-testid="home/c1/r${index}/root"`);
      expect(html).toContain(`data-testid="home/c1/r${index}/label"`);
    }
    expect(html).toContain("75%");
  });
});

describe("Bars rendering", () => {
  it.each([2, 3, 4, 5, 6, 7])("renders %i zero points in every state with and without a unit", (count) => {
    for (const unit of [undefined, "walks"])
      for (const state of ["filled", "empty", "loading"] as const) {
        const html = renderPoints(count, state, unit);
        expect(html.match(/data-testid="home\/c1\/root"/g)).toHaveLength(1);
        expect(html).not.toMatch(/role="(?:link|button)"/);
        if (state === "loading") {
          expect(html.match(/aria-busy="true"/g)).toHaveLength(1);
          expect(html).not.toBe(renderPoints(count === 7 ? 6 : 7, "loading", unit));
        }
        if (state === "empty") expect(html).toContain("Nothing here yet");
        if (state !== "filled") continue;
        const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
        expect(text).toContain(unit ? "Total 0 walks" : "Total 0");
        for (const part of ["title", "total"])
          expect(html.match(new RegExp(`data-testid="home/c1/${part}"`, "g"))).toHaveLength(1);
        for (let index = 1; index <= count; index++)
          for (const part of ["root", "label"])
            expect(html.match(new RegExp(`data-testid="home/c1/r${index}/${part}"`, "g"))).toHaveLength(1);
        expect(html).toContain('aria-hidden="true"');
      }
  });
});
