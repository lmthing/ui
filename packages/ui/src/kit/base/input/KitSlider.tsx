import { useRef } from "react";
import { useKit } from "../../provider";
import { XStack, YStack } from "tamagui";
import { component, radius, size, space } from "../../../catalog";
import { usePart } from "../../part";

/**
 * A themed slider: a rounded `$line` track, an `$accent` fill to `value` and a round thumb, inside a
 * 44px touch area that is the part (default `field`, the `set` action) with role slider and its value.
 * The range defaults to 0..10 in steps of 1; a component may pass its own.
 */
export function KitSlider({
  value = 0,
  label,
  min = 0,
  max = 10,
  part = "field",
}: {
  value?: number;
  label: string;
  min?: number;
  max?: number;
  part?: string;
}) {
  const kit = useKit();
  const address = usePart(part);
  const width = useRef(0);
  const cleanup = useRef<(() => void) | undefined>(undefined);
  const dispatch = (next: number) =>
    kit.controller?.act({
      address: address.testID,
      action: part === "scrubber" ? "seek" : "set",
      value: Math.min(max, Math.max(min, next)),
    });
  const clamped = Math.min(max, Math.max(min, value));
  const share = max > min ? (clamped - min) / (max - min) : 0;
  const thumb = size.icon.lg;
  return (
    <YStack
      {...address}
      onLayout={(event) => {
        width.current = event.nativeEvent.layout.width;
        address.onLayout();
      }}
      {...(kit.interactive && kit.controller && typeof document === "undefined"
        ? ({
            onStartShouldSetResponder: () => true,
            onResponderGrant: (event: { nativeEvent: { locationX: number } }) =>
              dispatch(
                Math.round(min + (event.nativeEvent.locationX / Math.max(1, width.current)) * (max - min)),
              ),
            onResponderMove: (event: { nativeEvent: { locationX: number } }) =>
              dispatch(
                Math.round(min + (event.nativeEvent.locationX / Math.max(1, width.current)) * (max - min)),
              ),
          } as object)
        : {})}
      {...(kit.interactive && kit.controller
        ? ({
            accessibilityActions: [{ name: "increment" }, { name: "decrement" }],
            onAccessibilityAction: (event: { nativeEvent: { actionName: string } }) =>
              dispatch(value + (event.nativeEvent.actionName === "increment" ? 1 : -1)),
          } as object)
        : {})}
      {...(kit.interactive && kit.controller && typeof document !== "undefined"
        ? ({
            tabIndex: 0,
            onKeyDown: (event: KeyboardEvent) => {
              const next =
                event.key === "Home"
                  ? min
                  : event.key === "End"
                    ? max
                    : event.key === "ArrowRight" || event.key === "ArrowUp"
                      ? value + 1
                      : event.key === "ArrowLeft" || event.key === "ArrowDown"
                        ? value - 1
                        : undefined;
              if (next !== undefined) {
                event.preventDefault();
                dispatch(next);
              }
            },
            onPointerDown: (event: PointerEvent) => {
              const node = event.currentTarget as HTMLElement;
              const rect = node.getBoundingClientRect();
              const position = (x: number) =>
                Math.round(min + ((x - rect.left - thumb / 2) / (rect.width - thumb)) * (max - min));
              dispatch(position(event.clientX));
              const move = (next: PointerEvent) => dispatch(position(next.clientX));
              const up = () => {
                document.removeEventListener("pointermove", move);
                document.removeEventListener("pointerup", up);
              };
              document.addEventListener("pointermove", move);
              document.addEventListener("pointerup", up, { once: true });
            },
          } as object)
        : {})}
      height={size.control.md}
      justifyContent="center"
      paddingHorizontal={thumb / 2}
      accessibilityRole="adjustable"
      {...({ role: "slider" } as object)}
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={clamped}
    >
      <XStack height={space.xs + space.xs / 2} borderRadius={radius.pill} backgroundColor="$line" aria-hidden>
        <YStack width={`${share * 100}%`} borderRadius={radius.pill} backgroundColor="$accent" />
        <YStack
          position="absolute"
          left={`${share * 100}%`}
          top={-(thumb - (space.xs + space.xs / 2)) / 2}
          marginLeft={-thumb / 2}
          width={thumb}
          height={thumb}
          borderRadius={radius.pill}
          backgroundColor="$surface"
          borderWidth={component.base.strongBorder}
          borderColor="$accent"
        />
      </XStack>
    </YStack>
  );
}
