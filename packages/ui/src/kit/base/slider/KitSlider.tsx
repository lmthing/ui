import { useEffect } from "react";
import { XStack, YStack, isWeb } from "tamagui";
import { component, radius, size, space } from "../../../catalog";
import { useComponentState, usePart } from "../../part";
import { useKit } from "../../provider";
import { useSlider } from "./use-slider";

type SliderProps = {
  value?: number;
  label: string;
  min?: number;
  max?: number;
  part?: string;
  step?: number;
  disabled?: boolean;
  appearance?: "track" | "wipe";
};
function SliderTrack({ share, inactive, loading }: { share: number; inactive: boolean; loading: boolean }) {
  const thumb = size.icon.lg;
  if (loading)
    return (
      <YStack height={thumb} width="100%" backgroundColor="$line" borderRadius={radius.pill} aria-hidden />
    );
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

function WipeDivider({ share }: { share: number }) {
  return (
    <YStack
      position="absolute"
      top={component.base.none}
      bottom={component.base.none}
      left={`${share * 100}%`}
      width={component.base.strongBorder}
      backgroundColor="$surface"
      justifyContent="center"
      alignItems="center"
      pointerEvents="none"
      aria-hidden
    >
      <YStack
        x={((1 - 2 * share) * (size.icon.lg - component.base.strongBorder)) / 2}
        width={size.icon.lg}
        height={size.icon.lg}
        borderRadius={radius.pill}
        borderWidth={component.base.strongBorder}
        borderColor="$accent"
        backgroundColor="$surface"
      />
    </YStack>
  );
}

function useDisabledWipe(address: string, disabled: boolean) {
  const { controller } = useKit();
  useEffect(
    () => (disabled ? controller?.registerDisabledPart(address) : undefined),
    [disabled, controller, address],
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
  appearance = "track",
}: SliderProps) {
  const address = usePart(part);
  const loading = useComponentState() === "loading";
  const inactive = disabled || loading;
  useDisabledWipe(address.testID, appearance === "wipe" && inactive);
  const { width, handlers } = useSlider({
    address: address.testID,
    part,
    value,
    min,
    max,
    step,
    disabled: inactive,
    inset: appearance === "wipe" ? component.base.none : size.icon.lg,
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
      {...(appearance === "wipe"
        ? { fullscreen: true, touchAction: "pan-y" as const }
        : { height: size.control.md, paddingHorizontal: size.icon.lg / 2 })}
      justifyContent="center"
      accessibilityRole={loading ? undefined : "adjustable"}
      {...({ role: loading ? undefined : "slider" } as object)}
      aria-label={loading ? undefined : label}
      aria-busy={loading || undefined}
      aria-hidden={loading || undefined}
      aria-disabled={disabled || undefined}
      {...(inactive ? { tabIndex: -1, ...(!isWeb ? { accessibilityState: { disabled: true } } : {}) } : {})}
      aria-valuemin={loading ? undefined : min}
      aria-valuemax={loading ? undefined : max}
      aria-valuenow={loading ? undefined : clamped}
    >
      {appearance === "wipe" ? (
        !inactive && <WipeDivider share={share} />
      ) : (
        <SliderTrack share={share} inactive={inactive} loading={loading} />
      )}
    </YStack>
  );
}
