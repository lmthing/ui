import { XStack, YStack } from "tamagui";
import { component, radius, size, space } from "../../../catalog";
import { useComponentState, usePart } from "../../part";
import { useSlider } from "./use-slider";

type SliderProps = {
  value?: number;
  label: string;
  min?: number;
  max?: number;
  part?: string;
  step?: number;
  disabled?: boolean;
};
function SliderTrack({ share, inactive }: { share: number; inactive: boolean }) {
  const thumb = size.icon.lg;
  return (
    <XStack height={space.xs + space.xs / 2} borderRadius={radius.pill} backgroundColor="$line" aria-hidden>
      <YStack
        width={`${share * 100}%`}
        borderRadius={radius.pill}
        backgroundColor={inactive ? "$muted" : "$accent"}
      />
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
        borderColor={inactive ? "$muted" : "$accent"}
      />
    </XStack>
  );
}

/** An addressed themed slider with native actions and web keyboard/pointer controls. */
export function KitSlider({
  value = 0,
  label,
  min = 0,
  max = 10,
  part = "field",
  step = 1,
  disabled = false,
}: SliderProps) {
  const address = usePart(part);
  const loading = useComponentState() === "loading";
  const inactive = disabled || loading;
  const { width, handlers } = useSlider({
    address: address.testID,
    part,
    value,
    min,
    max,
    step,
    disabled: inactive,
  });
  const clamped = Math.min(max, Math.max(min, value));
  const share = max > min ? (clamped - min) / (max - min) : 0;
  return (
    <YStack
      {...address}
      onLayout={(event) => {
        width.current = event.nativeEvent.layout.width;
        address.onLayout();
      }}
      {...(handlers as object)}
      height={size.control.md}
      justifyContent="center"
      paddingHorizontal={size.icon.lg / 2}
      accessibilityRole={loading ? undefined : "adjustable"}
      {...({ role: loading ? undefined : "slider" } as object)}
      aria-label={loading ? undefined : label}
      aria-busy={loading || undefined}
      aria-hidden={loading || undefined}
      aria-disabled={disabled || undefined}
      {...(inactive ? { tabIndex: -1, accessibilityState: { disabled: true } } : {})}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={clamped}
    >
      <SliderTrack share={share} inactive={inactive} />
    </YStack>
  );
}
