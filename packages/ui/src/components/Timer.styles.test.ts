import { describe, expect, it } from "vitest";
import { renderInstance } from "../../test/render";
import { components, timerLabels } from "@lmthing/ui/catalog";

const { meta } = components.Timer;
const input = { label: "Activity", seconds: 600 };

function renderTimer(style: "down" | "up", seconds: number) {
  return renderInstance(
    "Timer",
    { ...input, style, seconds },
    "filled",
    { preset: "calm", mode: "light", accent: "moss" },
    { component: "t1" },
  );
}

describe.each(["down", "up"] as const)("Timer rendering in %s", (style) => {
  it.each([
    [0, "0:00"],
    [600, "10:00"],
    [1260, "21:00"],
    [86400, "24:00:00"],
  ] as const)("renders %s seconds and both addressed buttons", (seconds, time) => {
    const html = renderTimer(style, seconds);
    for (const part of meta.parts.filter((part) => part !== "goal"))
      expect(html.match(new RegExp(`data-testid="home/t1/${part}"`, "g"))).toHaveLength(1);
    expect(html).not.toContain('data-testid="home/t1/goal"');
    expect(html).toContain(time);
    expect(html).toContain("tabular-nums");
    for (const part of ["start", "stop"] as const) {
      const tag = html.match(new RegExp(`<[^>]*data-testid="home/t1/${part}"[^>]*>`))?.[0];
      expect(tag).toContain('role="button"');
      expect(tag).toContain(`aria-label="${timerLabels[part]}"`);
    }
  });
});
