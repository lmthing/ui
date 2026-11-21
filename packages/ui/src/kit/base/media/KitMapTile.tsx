import { useState } from "react";
import { MapPin, UserRound } from "@tamagui/lucide-icons";
import { YStack } from "tamagui";
import { component, formatAddress, radius, size, space } from "../../../catalog";
import { PartContext, usePart, usePartContext } from "../../part";
import { useKit } from "../../provider";
import { KitText } from "../text";
import { Streets } from "../map";
import { KitPhoto } from "./KitPhoto";
import { PhotoLayer } from "./photo-layer";
import {
  centerOf,
  markSizeOf,
  nearestPin,
  offset,
  targetWidthOf,
  type Pin,
  type Point,
} from "./pin-placement";
type TileProps = { part?: string; underlay?: string | undefined } & (
  { count: number; pins?: undefined } | { count?: number; pins: readonly Pin[] }
);

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

type PlacedProps = {
  pin: Pin;
  width: number;
  height: number;
  loading: boolean;
  pins: readonly Pin[];
  imageSpace: boolean;
};

function PinGlyph({ pin }: { pin: Pin }) {
  const avatar = pin.mark === "avatar";
  const Glyph = avatar ? UserRound : MapPin;
  if (avatar && (pin.photo || pin.initials))
    return (
      <KitPhoto
        photo={pin.photo}
        initials={pin.initials}
        part={null}
        shape="round"
        ring={pin.selected ? "accent" : "none"}
      />
    );
  return <Glyph size={size.icon.md} color={pin.selected ? "$accent" : "$muted"} />;
}

function PlacedPin({ pin, width, height, loading, pins, imageSpace }: PlacedProps) {
  const dot = pin.mark === "dot",
    price = pin.mark === "price",
    avatar = pin.mark === "avatar";
  const targetWidth = targetWidthOf(pin, width),
    mark = markSizeOf(pin),
    markWidth = price ? targetWidth : mark,
    { x, y } = centerOf(pin, width, height, imageSpace);
  const left = offset(x, width, targetWidth),
    top = offset(y, height);
  const target = usePinTarget(pin, loading, { x: left, y: top }, (at) =>
    nearestPin(at, pins, width, height, imageSpace),
  );
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
        {!loading && !dot && !price && <PinGlyph pin={pin} />}
      </YStack>
    </YStack>
  );
}

export function KitMapTile({ count, pins, part = "map", underlay }: TileProps) {
  const context = usePartContext();
  const address = usePart(part);
  const { resolvePhoto } = useKit();
  const [width, setWidth] = useState(0);
  const height = Math.round(width / component.base.wideRatio);
  const emptyBadge = { alignSelf: "center", alignItems: "center", justifyContent: "center" } as const;
  if ((pins || underlay) && context.state === "empty")
    return (
      <YStack {...address} {...emptyBadge} width={size.control.md} height={size.control.md} aria-hidden>
        <MapPin size={size.icon.md} color="$muted" />
      </YStack>
    );
  const loading = (pins !== undefined || underlay !== undefined) && context.state === "loading";
  const source = !loading && underlay ? resolvePhoto?.(underlay) : undefined;
  const imageSpace = Boolean(underlay);
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
      {source ? (
        <PhotoLayer source={source} stretch />
      ) : (
        width > 0 && <Streets {...{ width, height }} count={pins ? 0 : (count ?? 0)} />
      )}
      {width > 0 &&
        pins?.map((pin) => (
          <PartContext.Provider key={pin.id} value={{ ...context, item: pin.target?.item ?? pin.id }}>
            <PlacedPin {...{ pin, width, height, loading, pins, imageSpace }} />
          </PartContext.Provider>
        ))}
    </YStack>
  );
}
