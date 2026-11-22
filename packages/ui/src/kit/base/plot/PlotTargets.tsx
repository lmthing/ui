import { useLayoutEffect } from "react";
import { isWeb, XStack, YStack } from "tamagui";
import { component, formatAddress, radius, size, space } from "../../../catalog";
import { PartContext, usePart, usePartContext } from "../../part";
import { useKit, useKitStyle } from "../../provider";
import { shifted } from "../text";
import { nearestPlotTarget, type LinePlotProps, type plotTargets } from "./linePlotGeometry";
import { PlotLabel } from "./PlotParts";

type Reading = ReturnType<typeof plotTargets>[number];
type Marker = Reading & { x: number; y: number };
type PressEvent = {
  stopPropagation?(): void;
  currentTarget?: { getBoundingClientRect?(): DOMRect };
  nativeEvent?: {
    clientX?: number;
    clientY?: number;
    detail?: number;
    locationX?: number;
    locationY?: number;
  };
};
const halfTarget = size.control.md / 2;

function pressOffset({ currentTarget, nativeEvent }: PressEvent) {
  if (!nativeEvent) return;
  if (!isWeb) {
    const { locationX, locationY } = nativeEvent;
    return locationX === undefined || locationY === undefined
      ? undefined
      : ([locationX - halfTarget, locationY - halfTarget] as const);
  }
  const { clientX, clientY, detail } = nativeEvent;
  const box = currentTarget?.getBoundingClientRect?.();
  if (!box?.width || !box.height || clientX === undefined || clientY === undefined || detail === 0) return;
  return [
    ((clientX - box.left) / box.width) * size.control.md - halfTarget,
    ((clientY - box.top) / box.height) * size.control.md - halfTarget,
  ] as const;
}

function usePointControl(
  { point, target }: Reading,
  selected: boolean,
  loading: boolean,
  markerPress?: (event: PressEvent) => void,
) {
  const address = usePart(target.part, !loading);
  const { interactive, controller } = useKit();
  const select = () =>
    controller?.act({
      address: address.testID,
      action: "select",
      ...(markerPress ? { value: point.id } : {}),
    });
  return {
    onLayout: address.onLayout,
    attributes: loading
      ? {}
      : {
          ...address,
          accessibilityRole: "button",
          accessibilityLabel: `${point.label}, ${point.value}`,
          ...(isWeb ? { "aria-pressed": selected } : { accessible: true, accessibilityState: { selected } }),
          ...(interactive && controller
            ? {
                focusable: true,
                cursor: "pointer",
                ...(!isWeb ? { onAccessibilityTap: select } : {}),
                onPress: (event: PressEvent) => {
                  event.stopPropagation?.();
                  if (markerPress) markerPress(event);
                  else select();
                },
                onKeyDown: (event: { key: string; preventDefault(): void; stopPropagation(): void }) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  event.stopPropagation();
                  select();
                },
              }
            : {}),
        },
  };
}

function BelowTarget({
  reading,
  selected,
  loading,
}: {
  reading: Reading;
  selected: boolean;
  loading: boolean;
}) {
  const { attributes } = usePointControl(reading, selected, loading);
  const ks = useKitStyle();
  return (
    <YStack
      {...(attributes as object)}
      minWidth={size.control.md}
      minHeight={size.control.md}
      padding={space.sm}
      justifyContent="center"
      borderRadius={shifted("sm", ks.radiusShift)}
      borderWidth={component.base.borderWidth}
      borderColor={selected && !loading ? "$accent" : "$line"}
      backgroundColor={selected && !loading ? "$accentSoft" : "$surface"}
    >
      <PlotLabel label={reading.point.label} loading={loading} tone="text" />
    </YStack>
  );
}

function MarkerTarget({
  marker,
  selected,
  press,
}: {
  marker: Marker;
  selected: boolean;
  press: (event: PressEvent) => void;
}) {
  const { x, y } = marker;
  const { onLayout, attributes } = usePointControl(marker, selected, false, press);
  // Layout observers do not always fire when an absolute target moves without resizing.
  useLayoutEffect(onLayout, [onLayout, x, y]);
  return (
    <YStack
      {...(attributes as object)}
      position="absolute"
      left={x - halfTarget}
      top={y - halfTarget}
      width={size.control.md}
      height={size.control.md}
      borderRadius={radius.pill}
      focusVisibleStyle={{
        outlineColor: "$accent",
        outlineStyle: "solid",
        outlineWidth: component.base.strongBorder,
      }}
    />
  );
}

type TargetsProps = { readings: readonly Reading[]; selected: LinePlotProps["selected"]; loading: boolean };
export function BelowPlotTargets({ readings, selected, loading }: TargetsProps) {
  const context = usePartContext();
  return readings.length ? (
    <XStack flexWrap="wrap" gap={space.sm}>
      {readings.map((reading) => (
        <PartContext.Provider
          key={reading.point.id}
          value={{ ...context, ...(reading.target.item ? { item: reading.target.item } : {}) }}
        >
          <BelowTarget reading={reading} selected={reading.point.id === selected} loading={loading} />
        </PartContext.Provider>
      ))}
    </XStack>
  ) : null;
}

export function MarkerPlotTargets({
  readings,
  selected,
  x,
  y,
}: Omit<TargetsProps, "loading"> & { x: (n: number) => number; y: (n: number) => number }) {
  const context = usePartContext();
  const { controller } = useKit();
  const markers = readings.map((reading) => ({
    ...reading,
    x: x(reading.point.x),
    y: y(reading.point.value),
  }));
  const press = (event: PressEvent, from: Marker) => {
    const offset = pressOffset(event);
    // Hit areas can overlap; a tap on either drawn dot should still select that dot.
    const { point, target } = offset ? nearestPlotTarget(markers, from, ...offset, halfTarget) : from;
    const { screen, component } = context;
    const item = target.item || context.item;
    const address = formatAddress({ screen, component, ...(item ? { item } : {}), part: target.part });
    controller?.act({ address, action: "select", value: point.id });
  };
  return markers.map((marker) => (
    <PartContext.Provider
      key={marker.point.id}
      value={{ ...context, ...(marker.target.item ? { item: marker.target.item } : {}) }}
    >
      <MarkerTarget
        marker={marker}
        selected={marker.point.id === selected}
        press={(event) => press(event, marker)}
      />
    </PartContext.Provider>
  ));
}
