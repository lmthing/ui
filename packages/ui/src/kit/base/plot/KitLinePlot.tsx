import { useKit, useKitStyle, useWords } from "../../provider";
import { useState } from "react";
import { Svg, Path, Line, Circle } from "react-native-svg";
import { XStack, YStack, useTheme } from "tamagui";
import { component, emptyLine, size, space, type as typography } from "../../../catalog";
import { PartContext, useEmptyThing, usePart, usePartContext } from "../../part";
import { KitIcon, KitText, shifted } from "../text";
import {
  bandPath,
  plotGeometry,
  plotPaths,
  type LinePlotProps,
  type Point,
  type Target,
} from "./linePlotGeometry";
import { PlotLabel } from "./PlotParts";

type DrawingProps = LinePlotProps & {
  width: number;
  height: number;
  geometry: ReturnType<typeof plotGeometry>;
};
function PlotPoints({ series, geometry, selected, loading, width, height }: DrawingProps) {
  const theme = useTheme();
  const pad = space.md;
  const x = (value: number) => pad + geometry.x(value) * (width - pad * 2);
  const y = (value: number) => pad + geometry.y(value) * (height - pad * 2);
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
                  y1={pad}
                  y2={height - pad}
                  stroke={theme[loading ? "line" : "muted"]?.val}
                  strokeWidth={component.base.borderWidth}
                  strokeDasharray={`${space.xs} ${space.xs}`}
                />
              )}
              <Circle
                cx={x(p.x)}
                cy={y(p.value!)}
                r={
                  p.id === selected || line.points.filter((point) => point.value !== null).length === 1
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
  const { width, height, loading } = props;
  const pad = space.md;
  const x = (value: number) => pad + geometry.x(value) * (width - pad * 2);
  const y = (value: number) => pad + geometry.y(value) * (height - pad * 2);
  const rule = { strokeWidth: component.base.borderWidth, stroke: theme.line?.val };
  return (
    <Svg width={width} height={height} aria-hidden>
      {geometry.bands.map((run, i) => {
        const d = bandPath(run, x, y);
        return d ? <Path key={i} d={d} fill={theme[loading ? "line" : "accentSoft"]?.val} /> : null;
      })}
      {geometry.ticks.map((value, index) => (
        <Line key={index} x1={pad} x2={width - pad} y1={y(value)} y2={y(value)} {...rule} />
      ))}
      {baseline !== undefined && Number.isFinite(baseline) && (
        <Line
          x1={pad}
          x2={width - pad}
          y1={y(baseline)}
          y2={y(baseline)}
          stroke={theme[loading ? "line" : "muted"]?.val}
          strokeWidth={component.base.strongBorder}
        />
      )}
      {goal && Number.isFinite(goal.value) && (
        <Path
          d={`M${pad},${y(goal.value)} L${width - pad},${y(goal.value)}`}
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

function PointTarget({
  point,
  target,
  selected,
  loading,
}: {
  point: Point;
  target: Target;
  selected: boolean;
  loading?: boolean;
}) {
  const address = usePart(target.part, !loading);
  const kit = useKit();
  const ks = useKitStyle();
  const select = () => kit.controller?.act({ address: address.testID, action: "select" });
  const control = loading
    ? {}
    : {
        ...address,
        accessibilityRole: "button",
        accessibilityLabel: `${point.label}, ${point.value}`,
        "aria-pressed": selected,
        ...(kit.interactive && kit.controller
          ? {
              focusable: true,
              cursor: "pointer",
              onPress: (event: { stopPropagation?(): void }) => {
                event.stopPropagation?.();
                select();
              },
              onKeyDown: (event: { key: string; preventDefault(): void; stopPropagation(): void }) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  select();
                }
              },
            }
          : {}),
      };
  return (
    <YStack
      {...(control as object)}
      minWidth={size.control.md}
      minHeight={size.control.md}
      padding={space.sm}
      justifyContent="center"
      borderRadius={shifted("sm", ks.radiusShift)}
      borderWidth={component.base.borderWidth}
      borderColor={selected && !loading ? "$accent" : "$line"}
      backgroundColor={selected && !loading ? "$accentSoft" : "$surface"}
    >
      <PlotLabel label={point.label} loading={!!loading} tone="text" />
    </YStack>
  );
}

function PlotTargets({ targets, series, selected, loading }: LinePlotProps) {
  const context = usePartContext();
  const controls = (targets ?? []).flatMap(({ point, target }) => {
    const reading = series.flatMap((line) => line.points).find((p) => p.id === point);
    return reading && reading.value !== null && Number.isFinite(reading.value) && Number.isFinite(reading.x)
      ? [{ point: reading, target }]
      : [];
  });
  return (
    !!controls.length && (
      <XStack flexWrap="wrap" gap={space.sm}>
        {controls.map(({ point, target }) => (
          <PartContext.Provider
            key={point.id}
            value={{ ...context, ...(target.item ? { item: target.item } : {}) }}
          >
            <PointTarget point={point} target={target} selected={point.id === selected} loading={!!loading} />
          </PartContext.Provider>
        ))}
      </XStack>
    )
  );
}

function PlotLabels({ series, unit, goal, loading, style = "full" }: LinePlotProps) {
  const geometry = plotGeometry(series, goal);
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
        paddingHorizontal={space.md}
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
  height,
  loading,
}: {
  geometry: ReturnType<typeof plotGeometry>;
  height: number;
  loading: boolean;
}) {
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
  const { lang } = useWords();

  const [width, setWidth] = useState<number>(component.base.emptyMinHeight);
  const geometry = plotGeometry(props.series, props.goal, props.band, props.baseline);
  const thing = useEmptyThing();
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
            {emptyLine(thing, lang)}
          </KitText>
        </YStack>
      ) : (
        <>
          <XStack gap={space.sm}>
            {style === "full" && <PlotAxis geometry={geometry} height={height} loading={loading} />}
            <YStack
              flex={1}
              minWidth={component.base.none}
              height={height}
              onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
            >
              <PlotDrawing {...props} geometry={geometry} loading={loading} width={width} height={height} />
            </YStack>
          </XStack>
          <PlotLabels {...props} style={style} loading={loading} />
          <PlotTargets {...props} loading={loading} />
        </>
      )}
    </YStack>
  );
}
