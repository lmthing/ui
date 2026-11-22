import { useWords } from "../../provider";
import { useState } from "react";
import { Svg, Path, Line, Circle } from "react-native-svg";
import { XStack, YStack, useTheme } from "tamagui";
import { component, emptyLine, size, space, type as typography } from "../../../catalog";
import { useEmptyThing, usePart } from "../../part";
import { KitIcon, KitText } from "../text";
import {
  bandPath,
  plotCoordinate,
  plotGeometry,
  plotPaths,
  plotTargets,
  type LinePlotProps,
} from "./linePlotGeometry";
import { PlotLabel } from "./PlotParts";
import { BelowPlotTargets, MarkerPlotTargets } from "./PlotTargets";

type DrawingProps = LinePlotProps & {
  width: number;
  height: number;
  geometry: ReturnType<typeof plotGeometry>;
  frame: { x: (n: number) => number; y: (n: number) => number; left: number; top: number };
  marked: ReadonlySet<string>;
};
function PlotPoints({
  series,
  frame: { x, y, top },
  marked,
  selected,
  loading,
  width,
  height,
}: DrawingProps) {
  const theme = useTheme();
  return (
    <>
      {series.flatMap((line) =>
        line.points
          .filter((p) => p.value !== null && Number.isFinite(p.value) && Number.isFinite(p.x))
          .map((p) => (
            <Svg key={`${line.id}/${p.id}`} width={width} height={height}>
              {p.id === selected && (
                <Line
                  x1={x(p.x)}
                  x2={x(p.x)}
                  y1={top}
                  y2={height - top}
                  stroke={theme[loading ? "line" : "muted"]?.val}
                  strokeWidth={component.base.borderWidth}
                  strokeDasharray={`${space.xs} ${space.xs}`}
                />
              )}
              <Circle
                cx={x(p.x)}
                cy={y(p.value!)}
                r={
                  p.id === selected ||
                  marked.has(p.id) ||
                  line.points.filter((point) => point.value !== null).length === 1
                    ? space.xs
                    : component.base.borderWidth
                }
                fill={theme[loading ? "muted" : (line.tone ?? "accent")]?.val}
                opacity={loading ? component.base.disabledOpacity : 1}
              />
            </Svg>
          )),
      )}
    </>
  );
}

function PlotDrawing({ series, goal, baseline, geometry, ...props }: DrawingProps) {
  const theme = useTheme();
  const {
    width,
    height,
    loading,
    frame: { x, y, left },
  } = props;
  const rule = { strokeWidth: component.base.borderWidth, stroke: theme.line?.val };
  return (
    <Svg width={width} height={height} aria-hidden>
      {geometry.bands.map((run, i) => {
        const d = bandPath(run, x, y);
        return d ? <Path key={i} d={d} fill={theme[loading ? "line" : "accentSoft"]?.val} /> : null;
      })}
      {geometry.ticks.map((value, index) => (
        <Line key={index} x1={left} x2={width - left} y1={y(value)} y2={y(value)} {...rule} />
      ))}
      {baseline !== undefined && Number.isFinite(baseline) && (
        <Line
          x1={left}
          x2={width - left}
          y1={y(baseline)}
          y2={y(baseline)}
          stroke={theme[loading ? "line" : "muted"]?.val}
          strokeWidth={component.base.strongBorder}
        />
      )}
      {goal && Number.isFinite(goal.value) && (
        <Path
          d={`M${left},${y(goal.value)} L${width - left},${y(goal.value)}`}
          fill="none"
          stroke={theme[loading ? "line" : "muted"]?.val}
          strokeWidth={component.base.borderWidth}
          strokeDasharray={`${space.sm} ${space.xs}`}
        />
      )}
      {series.map((line) => (
        <Path
          key={line.id}
          d={plotPaths(line.points, x, y)}
          fill="none"
          stroke={theme[loading ? "muted" : (line.tone ?? "accent")]?.val}
          opacity={loading ? component.base.disabledOpacity : 1}
          strokeWidth={loading ? space.xs : component.base.strongBorder}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      <PlotPoints series={series} geometry={geometry} {...props} />
    </Svg>
  );
}

function PlotLabels({
  series,
  unit,
  goal,
  loading,
  style = "full",
  geometry,
  inset,
}: LinePlotProps & { geometry: DrawingProps["geometry"]; inset: number }) {
  const labels = [
    ...series.map((line) => ({ label: line.label, tone: line.tone ?? "accent" })),
    ...(goal ? [{ label: goal.label, tone: "muted" as const }] : []),
    ...(unit ? [{ label: unit, tone: "muted" as const }] : []),
  ];
  return (
    <YStack gap={space.sm}>
      <XStack
        justifyContent="space-between"
        gap={space.md}
        paddingHorizontal={inset}
        marginLeft={style === "full" ? size.control.md + space.sm : component.base.none}
      >
        {(geometry.last ? [geometry.first, geometry.last] : [geometry.first]).map((label, i) => (
          <YStack key={i} flex={1}>
            <PlotLabel
              {...(label ? { label } : {})}
              loading={!!loading}
              role="caption"
              align={geometry.last ? (i ? "end" : "start") : "center"}
            />
          </YStack>
        ))}
      </XStack>
      <XStack flexWrap="wrap" gap={space.md}>
        {labels.map((entry, i) => (
          <PlotLabel key={i} {...entry} loading={!!loading} />
        ))}
      </XStack>
    </YStack>
  );
}

function PlotAxis({
  geometry,
  y,
  height,
  loading,
}: {
  geometry: ReturnType<typeof plotGeometry>;
  y: DrawingProps["frame"]["y"];
  height: number;
  loading: boolean;
}) {
  return (
    <YStack width={size.control.md} height={height} position="relative">
      {geometry.ticks.map((value, i) => (
        <YStack key={i} position="absolute" top={y(value) - typography.caption.lineHeight / 2}>
          <PlotLabel role="caption" loading={!!loading} label={String(Number(value.toPrecision(4)))} />
        </YStack>
      ))}
    </YStack>
  );
}

function PlotBody({
  style,
  loading,
  ...props
}: LinePlotProps & { style: NonNullable<LinePlotProps["style"]>; loading: boolean }) {
  const [width, setWidth] = useState<number>(component.base.emptyMinHeight);
  const geometry = plotGeometry(props.series, props.goal, props.band, props.baseline, props.center);
  const single = !geometry.empty && geometry.last === undefined;
  const height = style === "compact" || single ? component.base.sparkHeight * 2 : component.base.ringLg;
  const readings = plotTargets(props.series, props.targets);
  const onMarkers = props.targetPlacement === "marker";
  const pad = onMarkers ? size.control.md / 2 : space.md;
  const frame = {
    x: (value: number) => plotCoordinate(geometry.x(value), width, pad),
    y: (value: number) => plotCoordinate(geometry.y(value), height, pad),
    left: plotCoordinate(0, width, pad),
    top: plotCoordinate(0, height, pad),
  };
  if (geometry.empty && !loading) return <PlotEmpty height={height} />;
  return (
    <>
      <XStack gap={space.sm}>
        {style === "full" && <PlotAxis geometry={geometry} y={frame.y} height={height} loading={loading} />}
        <YStack
          flex={1}
          minWidth={component.base.none}
          height={height}
          position="relative"
          onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        >
          <PlotDrawing
            {...props}
            geometry={geometry}
            loading={loading}
            width={width}
            height={height}
            frame={frame}
            marked={new Set(onMarkers ? readings.map(({ point }) => point.id) : [])}
          />
          {onMarkers && !loading && (
            <MarkerPlotTargets readings={readings} selected={props.selected} x={frame.x} y={frame.y} />
          )}
        </YStack>
      </XStack>
      <PlotLabels {...props} style={style} loading={loading} geometry={geometry} inset={frame.left} />
      {!onMarkers && <BelowPlotTargets readings={readings} selected={props.selected} loading={loading} />}
    </>
  );
}

function PlotEmpty({ height }: { height: number }) {
  const { lang } = useWords();
  const thing = useEmptyThing();
  return (
    <YStack minHeight={height} alignItems="center" justifyContent="center" gap={space.md} padding={space.xl}>
      <KitIcon name="sparkles" tone="muted" scale="lg" decorative />
      <KitText role="body" tone="muted" align="center" part={null}>
        {emptyLine(thing, lang)}
      </KitText>
    </YStack>
  );
}

/** Labelled numeric lines with gaps and optional addressed controls below the plot or on its markers. */
export function KitLinePlot({ part = "root", loading = false, style = "full", ...props }: LinePlotProps) {
  return (
    <YStack
      {...usePart(part)}
      width="100%"
      gap={space.sm}
      aria-busy={loading}
      {...(loading ? { "aria-hidden": true, accessibilityElementsHidden: true } : {})}
    >
      <PlotBody {...props} style={style} loading={loading} />
    </YStack>
  );
}
