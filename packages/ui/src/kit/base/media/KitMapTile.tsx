import { useState } from "react";
import { MapPin } from "@tamagui/lucide-icons";
import { Svg, Path, Circle, Text as SvgText } from "react-native-svg";
import { YStack, useTheme } from "tamagui";
import { component, formatAddress, radius, size } from "../../../catalog";
import { PartContext, usePart, usePartContext } from "../../part";
import { useKit } from "../../provider";

const spots = [
  [0.22, 0.32],
  [0.62, 0.24],
  [0.44, 0.62],
  [0.8, 0.58],
  [0.18, 0.76],
] as const;

type Point = { x: number; y: number };
type Pin = Point & {
  selected?: boolean | undefined;
  mark?: "pin" | "dot";
  target?: { item?: string; part: string };
} & Record<"id" | "label", string>;
type TileProps = { part?: string } & (
  { count: number; pins?: undefined } | { count?: number; pins: readonly Pin[] }
);

function Streets({ width, height, count }: { width: number; height: number; count: number }) {
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

function markerCenter(coordinate: number, extent: number, markSize: number) {
  const share = Number.isFinite(coordinate) ? Math.max(0, Math.min(1, coordinate)) : 0.5;
  return markSize / 2 + share * (extent - markSize);
}

const offset = (center: number, extent: number) =>
  Math.max(0, Math.min(extent - size.control.md, center - size.control.md / 2));

type PressLocation = Partial<Record<"locationX" | "locationY" | "offsetX" | "offsetY" | "detail", number>>;
type PinPress = { stopPropagation?(): void; nativeEvent?: PressLocation };
function usePinTarget(pin: Pin, loading: boolean, origin: Point, nearest: (point: Point) => Pin | undefined) {
  const kit = useKit();
  const { screen, component } = usePartContext();
  const target = !loading && pin.target;
  const address = usePart(pin.target?.part, Boolean(target));
  const press = (event?: PinPress) => {
    const detail = event?.nativeEvent;
    const x = detail?.locationX ?? detail?.offsetX,
      y = detail?.locationY ?? detail?.offsetY;
    const point = x === undefined || y === undefined ? undefined : { x: origin.x + x, y: origin.y + y };
    const hit = point && detail?.detail !== 0 && nearest(point);
    if (!hit || !hit.target || hit === pin) return kit.controller?.press(address.testID);
    return kit.controller?.press(
      formatAddress({ screen, component, item: hit.target.item ?? hit.id, part: hit.target.part }),
    );
  };
  return {
    ...(target ? address : {}),
    accessibilityRole: loading ? undefined : target ? ("button" as const) : ("image" as const),
    accessibilityLabel: loading ? undefined : pin.label,
    "aria-pressed": target ? Boolean(pin.selected) : undefined,
    ...(target && kit.interactive && kit.controller
      ? {
          focusable: true,
          cursor: "pointer" as const,
          onPress: (event: PinPress) => {
            event.stopPropagation?.();
            return press(event);
          },
          onKeyDown: (event: { key?: string; preventDefault(): void }) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            return press();
          },
        }
      : {}),
  };
}

const markSizeOf = (pin: Pin) => (pin.mark === "dot" ? size.icon.sm : size.avatar.sm);
const centerOf = (pin: Pin, width: number, height: number): Point => ({
  x: markerCenter(pin.x, width, markSizeOf(pin)),
  y: markerCenter(pin.y, height, markSizeOf(pin)),
});
function nearestPin(at: Point, pins: readonly Pin[], width: number, height: number) {
  let closest: Pin | undefined,
    best = Infinity;
  for (const pin of pins) {
    if (!pin.target) continue;
    const { x, y } = centerOf(pin, width, height);
    const inside = (delta: number) => delta >= 0 && delta <= size.control.md;
    if (!inside(at.x - offset(x, width)) || !inside(at.y - offset(y, height))) continue;
    const distance = Math.hypot(x - at.x, y - at.y);
    if (distance >= best) continue;
    [best, closest] = [distance, pin];
  }
  return closest;
}

type PlacedProps = { pin: Pin; width: number; height: number; loading: boolean; pins: readonly Pin[] };
function PlacedPin({ pin, width, height, loading, pins }: PlacedProps) {
  const dot = pin.mark === "dot",
    mark = markSizeOf(pin),
    { x, y } = centerOf(pin, width, height);
  const left = offset(x, width),
    top = offset(y, height);
  const target = usePinTarget(pin, loading, { x: left, y: top }, (at) => nearestPin(at, pins, width, height));
  return (
    <YStack
      {...target}
      {...{ position: "absolute", left, top, width: size.control.md, height: size.control.md }}
      zIndex={!loading && pin.selected ? component.base.bodyFlex : undefined}
      pointerEvents={!pin.target || loading ? "none" : undefined}
      aria-hidden={loading || undefined}
    >
      <YStack
        position="absolute"
        {...{ left: x - left - mark / 2, top: y - top - mark / 2, width: mark, height: mark }}
        alignItems="center"
        justifyContent="center"
        pointerEvents="none"
        borderRadius={radius.pill}
        borderWidth={loading || (!dot && !pin.selected) ? undefined : component.base.strongBorder}
        borderColor={pin.selected ? "$accent" : "$surface"}
        backgroundColor={loading ? "$line" : pin.selected ? "$accentSoft" : dot ? "$muted" : "$surface"}
        aria-hidden
        accessibilityElementsHidden
      >
        {!loading && !dot && <MapPin size={size.icon.md} color={pin.selected ? "$accent" : "$muted"} />}
      </YStack>
    </YStack>
  );
}

export function KitMapTile({ count, pins, part = "map" }: TileProps) {
  const context = usePartContext();
  const address = usePart(part);
  const [width, setWidth] = useState(0);
  const height = Math.round(width / component.base.wideRatio);
  const emptyBadge = { alignSelf: "center", alignItems: "center", justifyContent: "center" } as const;
  if (pins && context.state === "empty")
    return (
      <YStack {...address} {...emptyBadge} width={size.control.md} height={size.control.md} aria-hidden>
        <MapPin size={size.icon.md} color="$muted" />
      </YStack>
    );
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
      {width > 0 && <Streets {...{ width, height }} count={pins ? 0 : (count ?? 0)} />}
      {width > 0 &&
        pins?.map((pin) => (
          <PartContext.Provider key={pin.id} value={{ ...context, item: pin.target?.item ?? pin.id }}>
            <PlacedPin {...{ pin, width, height, loading, pins }} />
          </PartContext.Provider>
        ))}
    </YStack>
  );
}
