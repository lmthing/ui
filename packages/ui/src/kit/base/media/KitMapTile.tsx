import { useState } from "react";
import { MapPin } from "@tamagui/lucide-icons";
import { Svg, Path, Circle, Text as SvgText } from "react-native-svg";
import { YStack, useTheme } from "tamagui";
import { component, radius, size, space } from "../../../catalog";
import { PartContext, usePart, usePartContext } from "../../part";
import { useKit } from "../../provider";

// Stable pin positions as shares of the tile (x, y), so a pin keeps its place across renders.
const spots = [
  [0.22, 0.32],
  [0.62, 0.24],
  [0.44, 0.62],
  [0.8, 0.58],
  [0.18, 0.76],
] as const;

type Pin = {
  id: string;
  label: string;
  x: number;
  y: number;
  selected?: boolean | undefined;
  mark?: "pin" | "dot";
  target?: { item?: string; part: string };
};
type TileProps = { part?: string } & (
  { count: number; pins?: undefined } | { count?: number; pins: readonly Pin[] }
);

function Streets({ width, height, count }: { width: number; height: number; count: number }) {
  const theme = useTheme();
  const c = (name: string) => (theme[name]?.val as string | undefined) ?? "currentColor";
  const pin = component.base.pinRadius;
  const numbered = spots.slice(0, Math.min(count, spots.length));
  return (
    <YStack aria-hidden accessibilityElementsHidden pointerEvents="none">
      <Svg width={width} height={height}>
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
        {numbered.map(([x, y], index) => (
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
    </YStack>
  );
}

// Keep the whole hit box inside the clipped tile, even for a pin at a map boundary.
function offset(coordinate: number, extent: number) {
  const center = (Number.isFinite(coordinate) ? coordinate : 0.5) * extent;
  return Math.max(0, Math.min(extent - size.control.md, center - size.control.md / 2));
}

function usePinTarget(pin: Pin, loading: boolean) {
  const kit = useKit();
  const target = !loading && pin.target;
  const address = usePart(pin.target?.part, Boolean(target));
  const press = () => kit.controller?.act({ address: address.testID, action: "select" });
  return {
    ...(target ? address : {}),
    accessibilityRole: loading ? undefined : target ? ("button" as const) : ("image" as const),
    accessibilityLabel: loading ? undefined : pin.label,
    ...(target ? { "aria-pressed": Boolean(pin.selected) } : {}),
    ...(target && kit.interactive && kit.controller
      ? {
          focusable: true,
          cursor: "pointer" as const,
          onPress: (event: { stopPropagation?(): void }) => {
            event.stopPropagation?.();
            return press();
          },
          onKeyDown: (event: { key?: string; preventDefault(): void; stopPropagation(): void }) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            event.stopPropagation();
            return press();
          },
        }
      : {}),
  };
}

function Marker({ pin, loading }: { pin: Pin; loading: boolean }) {
  const dot = pin.mark === "dot";
  const markSize = dot ? size.icon.sm : size.avatar.sm;
  return (
    <YStack
      width={markSize}
      height={markSize}
      alignItems="center"
      justifyContent="center"
      borderRadius={radius.pill}
      borderWidth={loading || (!dot && !pin.selected) ? undefined : component.base.strongBorder}
      borderColor={dot && !pin.selected ? "$surface" : "$accent"}
      backgroundColor={loading ? "$line" : pin.selected ? "$accentSoft" : dot ? "$accent" : "$surface"}
      aria-hidden
      accessibilityElementsHidden
    >
      {!loading && !dot && <MapPin size={size.icon.md} color="$accent" />}
    </YStack>
  );
}

function PlacedPin({
  pin,
  width,
  height,
  loading,
}: {
  pin: Pin;
  width: number;
  height: number;
  loading: boolean;
}) {
  return (
    <YStack
      {...usePinTarget(pin, loading)}
      position="absolute"
      left={offset(pin.x, width)}
      top={offset(pin.y, height)}
      width={size.control.md}
      height={size.control.md}
      zIndex={!loading && pin.selected ? component.base.bodyFlex : undefined}
      alignItems="center"
      justifyContent="center"
      pointerEvents={!pin.target || loading ? "none" : undefined}
      aria-hidden={loading || undefined}
    >
      <Marker pin={pin} loading={loading} />
    </YStack>
  );
}

/** A stylised map with legacy decorative numbers or caller-positioned, optionally selectable pins. */
export function KitMapTile({ count, pins, part = "map" }: TileProps) {
  const context = usePartContext();
  const address = usePart(part);
  const [width, setWidth] = useState(0);
  const height = Math.round(width / component.base.wideRatio);
  const loading = pins !== undefined && context.state === "loading";
  return (
    <YStack
      {...address}
      {...(pins === undefined ? {} : ({ "data-look-twoedge": true } as object))}
      width="100%"
      aspectRatio={component.base.wideRatio}
      borderRadius={radius.lg}
      overflow="hidden"
      backgroundColor="$raised"
      aria-hidden={pins === undefined || undefined}
      accessibilityElementsHidden={pins === undefined}
      aria-busy={loading || undefined}
      onLayout={(event) => {
        address.onLayout();
        setWidth(event.nativeEvent.layout.width);
      }}
    >
      {width > 0 && (
        <>
          <Streets width={width} height={height} count={pins === undefined ? (count ?? 0) : 0} />
          {pins?.map((pin) => (
            <PartContext.Provider key={pin.id} value={{ ...context, item: pin.target?.item ?? pin.id }}>
              <PlacedPin {...{ pin, width, height, loading }} />
            </PartContext.Provider>
          ))}
        </>
      )}
    </YStack>
  );
}
