import { useState } from "react";
import { XStack, YStack } from "tamagui";
import { component, emptyLine, size, space, type as typography } from "../../../catalog";
import { usePart, useEmptyThing } from "../../part";
import { KitIcon, KitText } from "../text";
import { plotGeometry, type LinePlotProps } from "./linePlotGeometry";
import { PlotDrawing } from "./PlotDrawing";
import { PlotLabel, PlotLabels, PlotTargets } from "./PlotParts";

function PlotAxis({ series, goal, height, loading }: LinePlotProps & { height: number }) {
  const geometry = plotGeometry(series, goal);
  return (
    <YStack width={size.control.md} height={height} position="relative">
      {geometry.ticks.map((value, i) => (
        <YStack
          key={i}
          position="absolute"
          top={space.md + geometry.y(value) * (height - space.md * 2) - typography.caption.lineHeight / 2}
        >
          <PlotLabel role="caption" loading={!!loading} label={String(Number(value.toPrecision(4)))} />
        </YStack>
      ))}
    </YStack>
  );
}

/** Labelled numeric lines. Null readings break paths; explicit targets are roomy controls below the plot. */
export function KitLinePlot({ part = "root", loading = false, style = "full", ...props }: LinePlotProps) {
  const [width, setWidth] = useState<number>(component.base.emptyMinHeight);
  const geometry = plotGeometry(props.series, props.goal),
    thing = useEmptyThing();
  const single = !geometry.empty && geometry.last === undefined;
  const height = style === "compact" || single ? component.base.sparkHeight * 2 : component.base.ringLg;
  return (
    <YStack
      {...usePart(part)}
      width="100%"
      gap={space.sm}
      aria-busy={loading}
      {...(loading ? { "aria-hidden": true, accessibilityElementsHidden: true } : {})}
    >
      {geometry.empty && !loading ? (
        <YStack
          minHeight={height}
          alignItems="center"
          justifyContent="center"
          gap={space.md}
          padding={space.xl}
        >
          <KitIcon name="sparkles" tone="muted" scale="lg" decorative />
          <KitText role="body" tone="muted" align="center" part={null}>
            {emptyLine(thing)}
          </KitText>
        </YStack>
      ) : (
        <>
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
          <PlotLabels {...props} style={style} loading={loading} />
          <PlotTargets {...props} loading={loading} />
        </>
      )}
    </YStack>
  );
}
