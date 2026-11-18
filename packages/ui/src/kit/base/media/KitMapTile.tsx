import { useState } from "react";
import { Svg, Path, Circle, Text as SvgText } from "react-native-svg";
import { YStack, useTheme } from "tamagui";
import { component, radius } from "../../../catalog";
import { usePart } from "../../part";

// Stable pin positions as shares of the tile (x, y), so a pin keeps its place across renders.
const spots = [
  [0.22, 0.32],
  [0.62, 0.24],
  [0.44, 0.62],
  [0.8, 0.58],
  [0.18, 0.76],
] as const;

/**
 * A stylised map, not a real one: soft streets in `$line` on a `$raised` ground, and numbered pins
 * 1..count in `$accent` at stable positions. The tile is the part (default `map`) and is decorative;
 * the component lists the places with matching numbers as text.
 */
export function KitMapTile({ count, part = "map" }: { count: number; part?: string }) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const height = Math.round(width / component.base.wideRatio);
  const c = (name: string) => (theme[name]?.val as string | undefined) ?? "currentColor";
  const pin = component.base.pinRadius;
  return (
    <YStack
      {...usePart(part)}
      width="100%"
      aspectRatio={component.base.wideRatio}
      borderRadius={radius.lg}
      overflow="hidden"
      backgroundColor="$raised"
      aria-hidden
      accessibilityElementsHidden
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      {width > 0 && (
        <Svg width={width} height={height}>
          <Path
            d={`M0 ${height * 0.45} C ${width * 0.3} ${height * 0.35}, ${width * 0.6} ${height * 0.55}, ${width} ${height * 0.42} M ${width * 0.35} 0 C ${width * 0.4} ${height * 0.4}, ${width * 0.3} ${height * 0.7}, ${width * 0.38} ${height} M ${width * 0.7} 0 L ${width * 0.66} ${height}`}
            stroke={c("line")}
            strokeWidth={component.base.streetWidth}
            fill="none"
            strokeLinecap="round"
          />
          {spots.slice(0, Math.min(count, spots.length)).map(([x, y], index) => (
            <Circle key={`c${index}`} cx={x * width} cy={y * height} r={pin} fill={c("accent")} />
          ))}
          {spots.slice(0, Math.min(count, spots.length)).map(([x, y], index) => (
            <SvgText
              key={`t${index}`}
              x={x * width}
              y={y * height + component.base.pinText / 2.8}
              fontSize={component.base.pinText}
              fontWeight="700"
              textAnchor="middle"
              fill={c("onAccent")}
            >
              {String(index + 1)}
            </SvgText>
          ))}
        </Svg>
      )}
    </YStack>
  );
}
