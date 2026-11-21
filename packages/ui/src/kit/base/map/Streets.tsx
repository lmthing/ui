import { Svg, Path, Circle, Text as SvgText } from "react-native-svg";
import { useTheme } from "tamagui";
import { component } from "../../../catalog";

const spots = [
  [0.22, 0.32],
  [0.62, 0.24],
  [0.44, 0.62],
  [0.8, 0.58],
  [0.18, 0.76],
] as const;

export function Streets({ width, height, count }: { width: number; height: number; count: number }) {
  const theme = useTheme();
  const c = (name: string) => (theme[name]?.val as string | undefined) ?? "currentColor";
  const pin = component.base.pinRadius;
  const numbered = spots.slice(0, Math.min(count, spots.length));
  return (
    <Svg width={width} height={height} pointerEvents="none" aria-hidden>
      <Path
        d={`M0 ${height * 0.45} C ${width * 0.3} ${height * 0.35}, ${width * 0.6} ${height * 0.55}, ${width} ${height * 0.42} M ${width * 0.35} 0 C ${width * 0.4} ${height * 0.4}, ${width * 0.3} ${height * 0.7}, ${width * 0.38} ${height} M ${width * 0.7} 0 L ${width * 0.66} ${height}`}
        stroke={c("line")}
        strokeWidth={component.base.streetWidth}
        fill="none"
        strokeLinecap="round"
      />
      {numbered.map(([x, y], index) => (
        <Circle key={`c${index}`} cx={x * width} cy={y * height} r={pin} fill={c("accent")} />
      ))}
      {numbered.map(([x, y], i) => {
        const at = { x: x * width, y: y * height + component.base.pinText / 2.8 };
        const font = { fontSize: component.base.pinText, fontWeight: "700", textAnchor: "middle" } as const;
        return (
          <SvgText key={i} {...at} {...font} fill={c("onAccent")}>
            {String(i + 1)}
          </SvgText>
        );
      })}
    </Svg>
  );
}
