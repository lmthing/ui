import { useState } from "react";
import { XStack, YStack } from "tamagui";
import { component, radius, space, variants, type AxisValue } from "../../../catalog";
import { useComponentState, usePart } from "../../part";
import { KitSlider } from "../slider";
import { KitText } from "../text";
import { PhotoLayer, usePhotoLayer, type PhotoLayerSource } from "./photo-layer";

type CompareProps = {
  beforePhoto?: string;
  afterPhoto?: string;
  beforeLabel: string;
  afterLabel: string;
  label: string;
  split: number;
  part?: string;
  sliderPart?: string;
  aspect?: Exclude<AxisValue<"aspect">, "auto">;
  disabled?: boolean;
};

function ClippedBefore({ layer, width, clip }: { layer: PhotoLayerSource; width: number; clip: number }) {
  return (
    <YStack
      position="absolute"
      top={component.base.none}
      bottom={component.base.none}
      width={`${clip}%`}
      overflow="hidden"
      pointerEvents="none"
    >
      <PhotoLayer key={layer.source} {...layer} width={width} />
    </YStack>
  );
}

function CompareLabels({ before, after }: { before: string; after: string }) {
  return (
    <XStack
      position="absolute"
      top={space.sm}
      left={space.sm}
      right={space.sm}
      gap={space.sm}
      justifyContent="space-between"
      pointerEvents="none"
    >
      {[before, after].map((label, index) => (
        <YStack
          key={index}
          backgroundColor="$surface"
          borderRadius={radius.pill}
          paddingHorizontal={space.sm}
        >
          <KitText part={null} role="label" lines={1}>
            {label}
          </KitText>
        </YStack>
      ))}
    </XStack>
  );
}

/** Both images fill the same rectangle; the split clips the before image, never resizing it. */
export function KitPhotoCompare({
  beforePhoto,
  afterPhoto,
  beforeLabel,
  afterLabel,
  label,
  split,
  part = "root",
  sliderPart = "split",
  aspect = "wide",
  disabled = false,
}: CompareProps) {
  const loading = useComponentState() === "loading";
  const address = usePart(part);
  const [width, setWidth] = useState(0);
  const before = usePhotoLayer(loading ? undefined : beforePhoto);
  const after = usePhotoLayer(loading ? undefined : afterPhoto);
  const value = Number.isFinite(split) ? Math.min(100, Math.max(0, split)) : 50;
  return (
    <YStack
      {...address}
      width="100%"
      aspectRatio={variants.aspect[aspect]}
      overflow="hidden"
      borderRadius={radius.lg}
      backgroundColor={loading ? "$line" : "$raised"}
      aria-busy={loading || undefined}
      onLayout={(event) => {
        address.onLayout();
        setWidth(event.nativeEvent.layout.width);
      }}
    >
      {after.layer && <PhotoLayer key={after.layer.source} {...after.layer} />}
      {before.layer && width > 0 && (
        <ClippedBefore layer={before.layer} width={width} clip={after.ready ? value : 100} />
      )}
      {!loading && <CompareLabels before={beforeLabel} after={afterLabel} />}
      {!loading && (
        <KitSlider
          appearance="wipe"
          min={0}
          max={100}
          value={value}
          label={label}
          part={sliderPart}
          disabled={disabled || !before.ready || !after.ready}
        />
      )}
    </YStack>
  );
}
