import { XStack, YStack } from "tamagui";
import { component, radius, size, space } from "../../../catalog";
import { usePart } from "../../part";
import { useSlider } from "./use-slider";

type SliderProps = {
  value?: number;
  label: string;
  min?: number;
  max?: number;
  part?: string;
};
function SliderTrack({ share }: { share: number }) {
  const thumb = size.icon.lg;
  return (
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
  );
}

/** An addressed themed slider with native actions and web keyboard/pointer controls. */
export function KitSlider({ value = 0, label, min = 0, max = 10, part = "field" }: SliderProps) {
  const address = usePart(part);
  const { width, handlers } = useSlider({ address: address.testID, part, value, min, max });
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
      accessibilityRole="adjustable"
      {...({ role: "slider" } as object)}
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={clamped}
    >
      <SliderTrack share={share} />
    </YStack>
  );
}
