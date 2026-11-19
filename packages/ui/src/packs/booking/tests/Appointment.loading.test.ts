import { expect, it } from "vitest";
import { compactMoneyLine, components, durationLine, type as typography } from "@lmthing/ui/catalog";
import { renderInstance, styleAt } from "../../../../test/render";

function textStyle(html: string, text: string): string {
  const node = [...html.matchAll(/(<span\b[^>]*>)([^<]*)<\/span>/g)].find((match) => match[2] === text);
  if (!node) throw new Error(`No rendered text: ${text}`);
  return styleAt(html, { tag: "span", attributes: node[1]!, children: [] });
}

it.each(
  (["calm", "bold", "editorial"] as const).flatMap((preset) =>
    (["light", "dark"] as const).flatMap((mode) =>
      (["card", "summary"] as const).map((style) => ({ preset, mode, style })),
    ),
  ),
)(
  "matches $preset/$mode/$style loading duration and price to filled compact numbers, keeping time display-sized",
  ({ preset, mode, style }) => {
    for (const minutes of [5, 600])
      for (const price of [0, Number.MAX_VALUE]) {
        const input = { ...components.Appointment.examples[0]!, style, minutes, price };
        const theme = { preset, mode, accent: "moss" } as const;
        const filled = renderInstance("Appointment", input, "filled", theme);
        const loading = renderInstance("Appointment", input, "loading", theme);
        for (const text of [durationLine(minutes), compactMoneyLine(price), input.time]) {
          const scale = text === input.time ? typography.number : typography.body;
          for (const html of [filled, loading]) {
            expect(textStyle(html, text)).toContain(`font-size:${scale.size}px`);
            expect(textStyle(html, text)).toContain(`line-height:${scale.lineHeight}px`);
          }
        }
      }
  },
);
