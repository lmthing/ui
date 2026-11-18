import { useState } from "react";
import { Svg, Polyline, Circle } from "react-native-svg";
import { YStack, useTheme } from "tamagui";
import { component } from "../../../catalog";
import { usePart } from "../../part";

/**
 * A small trend line through `points`, scaled to fit, with a dot on the latest value. Drawn in the
 * tone (`accent`, `good`, `warn`, `bad`). The drawing is the part (default `line`) and hidden from
 * assistive tech: the latest value is written beside it as text.
 */
export function KitSpark({
  points,
  tone = "accent",
  part = "line",
}: {
  points: number[];
  tone?: "accent" | "good" | "warn" | "bad";
  part?: string;
}) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const height = component.base.sparkHeight;
  const pad = component.base.strongBorder * 2;
  const lo = Math.min(...points),
    hi = Math.max(...points);
  const xy = points.map((value, index) => {
    const x = pad + (index / Math.max(points.length - 1, 1)) * (width - pad * 2);
    const y = pad + (hi === lo ? 0.5 : 1 - (value - lo) / (hi - lo)) * (height - pad * 2);
    return [x, y] as const;
  });
  const colour = (theme[tone]?.val as string | undefined) ?? "currentColor";
  const last = xy[xy.length - 1];
  return (
    <YStack
      {...usePart(part)}
      height={height}
      width="100%"
      aria-hidden
      accessibilityElementsHidden
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      {width > 0 && last && (
        <Svg width={width} height={height}>
          <Polyline
            points={xy.map(([x, y]) => `${x},${y}`).join(" ")}
            fill="none"
            stroke={colour}
            strokeWidth={component.base.strongBorder}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <Circle cx={last[0]} cy={last[1]} r={pad} fill={colour} />
        </Svg>
      )}
    </YStack>
  );
}
