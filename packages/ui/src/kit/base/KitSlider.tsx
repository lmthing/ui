import { XStack, YStack } from "tamagui";
import { component, radius, size, space } from "../../catalog";
import { usePart } from "../part";

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
  const clamped = Math.min(max, Math.max(min, value));
  const share = max > min ? (clamped - min) / (max - min) : 0;
  const thumb = size.icon.lg;
  return (
    <YStack
      {...usePart(part)}
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
