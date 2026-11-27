import { YStack, isWeb } from "tamagui";
import { component, radius, size, snapNumber, space } from "../../../catalog";
import { useNumericControl } from "../../interact";
import { useComponentState, usePart, usePartDisabled } from "../../part";
import { useSlider } from "./use-slider";
import { useRangeGesture } from "./use-range-gesture";

type Endpoint = { part: string; label: string; value: number };
export type RangeSliderProps = {
  range: readonly [Endpoint, Endpoint];
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  /** Use the single-thumb track rail when paired with a single slider. */
  alignTrack?: boolean;
};
const percent = (share: number): `${number}%` => `${share * 100}%`;
const trackHeight = space.xs + space.xs / 2;
const thumbSize = size.icon.lg;
const center = (size.control.md - trackHeight) / 2;

function useEndpoint(endpoint: Endpoint, loading: boolean) {
  const address = usePart(endpoint.part, !loading);
  const numeric = useNumericControl(address.testID, !loading);
  const blocked = usePartDisabled(address.testID);
  return {
    ...endpoint,
    address,
    numeric,
    disabled: blocked || numeric === null,
    value: numeric?.value ?? endpoint.value,
  };
}

function ThumbMark({ share, inactive }: { share: number; inactive: boolean }) {
  return (
    <YStack
      position="absolute"
      left={percent(share)}
      top={(size.control.md - thumbSize) / 2}
      marginLeft={-thumbSize / 2}
      width={thumbSize}
      height={thumbSize}
      borderRadius={radius.pill}
      borderWidth={component.base.strongBorder}
      borderColor={inactive ? "$muted" : "$accent"}
      backgroundColor="$surface"
      pointerEvents="none"
      aria-hidden
    />
  );
}

type Region = {
  endpoint: ReturnType<typeof useEndpoint>;
  min: number;
  max: number;
  value: number;
  step: number;
  inactive: boolean;
  share: number;
};

function ThumbRegion({ endpoint, min, max, step, value, inactive, share }: Region) {
  const disabled = inactive || endpoint.disabled;
  const { handlers } = useSlider({
    address: endpoint.address.testID,
    part: endpoint.part,
    action: "set",
    value,
    min,
    max,
    step,
    disabled,
    declared: Boolean(endpoint.numeric),
    keyboardOnly: true,
  });
  return (
    <YStack
      {...endpoint.address}
      {...(handlers as object)}
      position="absolute"
      top={component.base.none}
      bottom={component.base.none}
      left={percent(share)}
      width={size.control.md}
      marginLeft={-size.control.md / 2}
      pointerEvents="none"
      accessibilityRole="adjustable"
      {...(isWeb ? { role: "slider" } : { accessibilityState: { disabled } })}
      aria-label={endpoint.label}
      aria-disabled={disabled || undefined}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      {...(disabled ? { tabIndex: -1 } : {})}
    />
  );
}

function RangeTrack({
  start,
  end,
  loading,
  disabled,
}: {
  start: number;
  end: number;
  loading: boolean;
  disabled: boolean;
}) {
  return (
    <YStack
      position="absolute"
      top={center}
      width="100%"
      height={trackHeight}
      borderRadius={radius.pill}
      backgroundColor="$line"
      pointerEvents="none"
      aria-hidden
    >
      {!loading && (
        <YStack
          position="absolute"
          left={percent(start)}
          right={percent(1 - end)}
          height="100%"
          borderRadius={radius.pill}
          backgroundColor={disabled ? "$muted" : "$accent"}
        />
      )}
    </YStack>
  );
}

function useRangeEndpoints({ range, min, max, step = 1, disabled = false, alignTrack }: RangeSliderProps) {
  const loading = useComponentState() === "loading";
  const lower = useEndpoint(range[0], loading);
  const upper = useEndpoint(range[1], loading);
  const tick = Number.isFinite(step) && step > 0 ? step : 1;
  const lo = snapNumber(lower.value, min, max, tick);
  const hi = Math.max(lo, snapNumber(upper.value, min, max, tick));
  const last = snapNumber(max, min, max, tick);
  const share = (value: number) => (max > min ? (value - min) / (max - min) : 0);
  const clampMin = (value: number | undefined) => Math.max(min, value ?? min);
  const clampMax = (value: number | undefined) => Math.min(last, value ?? last);
  const first = { min: clampMin(lower.numeric?.min), max: Math.min(hi, clampMax(lower.numeric?.max)) };
  const second = { min: Math.max(lo, clampMin(upper.numeric?.min)), max: clampMax(upper.numeric?.max) };
  const { width, handlers } = useRangeGesture({
    min,
    max,
    step: tick,
    disabled: disabled || loading,
    inset: alignTrack ? size.icon.lg / 2 : size.control.md / 2,
    ends: [
      { ...first, address: lower.address.testID, value: lo, disabled: lower.disabled },
      { ...second, address: upper.address.testID, value: hi, disabled: upper.disabled },
    ],
  });
  return { loading, lower, upper, tick, lo, hi, share, first, second, width, handlers };
}

/** One shared track with an independently addressed, non-crossing control for each endpoint. */
export function RangeSlider(props: RangeSliderProps) {
  const { disabled = false } = props;
  const { loading, lower, upper, tick, lo, hi, share, first, second, width, handlers } =
    useRangeEndpoints(props);
  return (
    <YStack
      height={size.control.md}
      aria-busy={loading || undefined}
      {...(handlers as object)}
      {...(isWeb && handlers ? { touchAction: "pan-y" as const } : {})}
      onLayout={(event) => {
        width.current = event.nativeEvent.layout.width;
      }}
    >
      <YStack
        marginHorizontal={props.alignTrack ? size.icon.lg / 2 : size.control.md / 2}
        height="100%"
        pointerEvents="box-none"
      >
        <RangeTrack start={share(lo)} end={share(hi)} loading={loading} disabled={disabled} />
        {!loading && (
          <>
            <ThumbMark share={share(lo)} inactive={disabled || lower.disabled} />
            <ThumbMark share={share(hi)} inactive={disabled || upper.disabled} />
            <ThumbRegion
              endpoint={lower}
              {...first}
              step={tick}
              inactive={disabled}
              value={lo}
              share={share(lo)}
            />
            <ThumbRegion
              endpoint={upper}
              {...second}
              step={tick}
              inactive={disabled}
              value={hi}
              share={share(hi)}
            />
          </>
        )}
      </YStack>
    </YStack>
  );
}
