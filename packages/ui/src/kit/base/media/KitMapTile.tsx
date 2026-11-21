import { useState } from "react";
import { MapPin, UserRound } from "@tamagui/lucide-icons";
import { YStack } from "tamagui";
import { component, formatAddress, radius, size, space } from "../../../catalog";
import { PartContext, usePart, usePartContext } from "../../part";
import { useKit } from "../../provider";
import { KitText } from "../text";
import { Streets } from "../map";
import { KitPhoto } from "./KitPhoto";
type Point = { x: number; y: number };
type Pin = Point & {
  selected?: boolean | undefined;
  mark?: "pin" | "dot" | "price" | "avatar";
  photo?: string;
  initials?: string;
  target?: { item?: string; part: string };
} & Record<"id" | "label", string>;
type TileProps = { part?: string } & (
  { count: number; pins?: undefined } | { count?: number; pins: readonly Pin[] }
);

function markerCenter(coordinate: number, extent: number, markSize: number) {
  const share = Number.isFinite(coordinate) ? Math.max(0, Math.min(1, coordinate)) : 0.5;
  return markSize / 2 + share * (extent - markSize);
}

const offset = (center: number, extent: number, target: number = size.control.md) =>
  Math.max(0, Math.min(extent - target, center - target / 2));

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

const markSizeOf = (pin: Pin) =>
  pin.mark === "dot" ? size.icon.sm : pin.mark === "avatar" ? size.avatar.md : size.avatar.sm;
const targetWidthOf = (pin: Pin, width: number) =>
  pin.mark === "price" ? Math.min(width, size.avatar.lg) : size.control.md;
const centerOf = (pin: Pin, width: number, height: number): Point => ({
  x: markerCenter(pin.x, width, pin.mark === "price" ? targetWidthOf(pin, width) : markSizeOf(pin)),
  y: markerCenter(pin.y, height, markSizeOf(pin)),
});
function nearestPin(at: Point, pins: readonly Pin[], width: number, height: number) {
  let closest: Pin | undefined,
    best = Infinity;
  for (const pin of pins) {
    if (!pin.target) continue;
    const { x, y } = centerOf(pin, width, height);
    const targetWidth = targetWidthOf(pin, width);
    const inside = (delta: number, extent: number) => delta >= 0 && delta <= extent;
    if (
      !inside(at.x - offset(x, width, targetWidth), targetWidth) ||
      !inside(at.y - offset(y, height), size.control.md)
    )
      continue;
    const distance = Math.hypot(x - at.x, y - at.y);
    if (distance >= best) continue;
    [best, closest] = [distance, pin];
  }
  return closest;
}

type PlacedProps = { pin: Pin; width: number; height: number; loading: boolean; pins: readonly Pin[] };
function PlacedPin({ pin, width, height, loading, pins }: PlacedProps) {
  const dot = pin.mark === "dot",
    price = pin.mark === "price",
    avatar = pin.mark === "avatar";
  const Glyph = avatar ? UserRound : MapPin;
  const targetWidth = targetWidthOf(pin, width),
    mark = markSizeOf(pin),
    markWidth = price ? targetWidth : mark,
    { x, y } = centerOf(pin, width, height);
  const left = offset(x, width, targetWidth),
    top = offset(y, height);
  const target = usePinTarget(pin, loading, { x: left, y: top }, (at) => nearestPin(at, pins, width, height));
  return (
    <YStack
      {...target}
      {...{ position: "absolute", left, top, width: targetWidth, height: size.control.md }}
      zIndex={!loading && pin.selected ? component.base.bodyFlex : undefined}
      pointerEvents={!pin.target || loading ? "none" : undefined}
      aria-hidden={loading || undefined}
    >
      <YStack
        position="absolute"
        {...{ left: x - left - markWidth / 2, top: y - top - mark / 2, width: markWidth, height: mark }}
        alignItems="center"
        justifyContent="center"
        pointerEvents="none"
        borderRadius={radius.pill}
        borderWidth={
          loading || (!dot && !price && !pin.selected) || avatar ? undefined : component.base.strongBorder
        }
        borderColor={pin.selected ? "$accent" : price ? "$line" : "$surface"}
        backgroundColor={loading ? "$line" : pin.selected ? "$accentSoft" : dot ? "$muted" : "$surface"}
        aria-hidden
        accessibilityElementsHidden
      >
        {!loading && price && (
          <YStack maxWidth="100%" paddingHorizontal={space.xs}>
            <KitText role="caption" tone="text" part={null} lines={1}>
              {pin.label}
            </KitText>
          </YStack>
        )}
        {!loading &&
          !dot &&
          !price &&
          (avatar && (pin.photo || pin.initials) ? (
            <KitPhoto
              photo={pin.photo}
              initials={pin.initials}
              part={null}
              shape="round"
              ring={pin.selected ? "accent" : "none"}
            />
          ) : (
            <Glyph size={size.icon.md} color={pin.selected ? "$accent" : "$muted"} />
          ))}
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
