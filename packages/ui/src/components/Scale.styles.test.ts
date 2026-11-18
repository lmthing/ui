import { describe, expect, it } from "vitest";
import { components } from "@lmthing/ui/catalog";
import { renderInstance } from "../../test/render";

const {} = components.Scale;

describe("Scale rendering", () => {
  it.each(["mood", "stars", "dots"] as const)(
    "draws every %s value with exactly one address and the right radio state per level",
    (style) => {
      for (const value of [0, 1, 2, 3, 4, 5]) {
        const html = renderInstance("Scale", { label: "a".repeat(32), style, value }, "filled", {
          preset: "calm",
          mode: "light",
          accent: "moss",
        });
        expect(html.match(/data-testid=/g)).toHaveLength(7);
        expect(html.match(/role="radiogroup"/g)).toHaveLength(1);
        for (const part of ["root", "label"])
          expect(html.match(new RegExp(`data-testid="home/c1/${part}"`, "g"))).toHaveLength(1);
        for (const level of [1, 2, 3, 4, 5]) {
          const target = html.match(new RegExp(`<[^>]*data-testid="home/c1/l${level}"[^>]*>`))?.[0];
          expect(target).toContain('role="radio"');
          expect(target).toContain(`aria-checked="${level === value}"`);
          expect(target).toContain(`aria-label="${level} of 5"`);
        }
        if (style === "stars") expect(html.match(/fill="currentColor"/g) ?? []).toHaveLength(value);
      }
    },
  );
});
