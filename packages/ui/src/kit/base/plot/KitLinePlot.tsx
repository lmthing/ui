import { useState } from "react";
import { XStack, YStack } from "tamagui";
import { component, size, space } from "../../../catalog";
import { usePart } from "../../part";
import { plotGeometry, type LinePlotProps } from "./linePlotGeometry";
import { PlotDrawing } from "./PlotDrawing";
import { PlotLabel, PlotLabels, PlotTargets } from "./PlotParts";

function PlotAxis({ series, goal, height, loading }: LinePlotProps & { height: number }) {
  const geometry = plotGeometry(series, goal);
  return (
    <YStack width={size.control.md} height={height} justifyContent="space-between" paddingVertical={space.xs}>
      {geometry.ticks.map((value, i) => (
        <PlotLabel key={i} role="caption" loading={!!loading} label={String(Number(value.toPrecision(4)))} />
      ))}
    </YStack>
  );
}

/** Labelled numeric lines. Null readings break paths; explicit targets are roomy controls below the plot. */
export function KitLinePlot({ part = "root", loading = false, style = "full", ...props }: LinePlotProps) {
  const [width, setWidth] = useState<number>(component.base.emptyMinHeight);
  const height = style === "compact" ? component.base.sparkHeight * 2 : component.base.ringLg;
  return (
    <YStack
      {...usePart(part)}
      width="100%"
      gap={space.sm}
      aria-busy={loading}
      {...(loading ? { "aria-hidden": true, accessibilityElementsHidden: true } : {})}
    >
      <XStack gap={space.sm}>
        {style === "full" && <PlotAxis {...props} height={height} loading={loading} />}
        <YStack
          flex={1}
          minWidth={component.base.none}
          height={height}
          onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        >
          <PlotDrawing {...props} loading={loading} width={width} height={height} />
        </YStack>
      </XStack>
      <PlotLabels {...props} loading={loading} />
      <PlotTargets {...props} loading={loading} />
    </YStack>
  );
}
