import { useTheme } from "tamagui";
import { Svg, Path, Line, Circle } from "react-native-svg";
import { component, space } from "../../../catalog";
import { plotGeometry, plotPaths, type LinePlotProps } from "./linePlotGeometry";

type DrawingProps = LinePlotProps & { width: number; height: number };
function PlotPoints({ series, goal, selected, loading, width, height }: DrawingProps) {
  const theme = useTheme(),
    geometry = plotGeometry(series, goal);
  const pad = space.sm;
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
                r={p.id === selected ? space.xs : component.base.borderWidth}
                fill={theme[loading ? "line" : (line.tone ?? "accent")]?.val}
              />
            </Svg>
          )),
      )}
    </>
  );
}

export function PlotDrawing({ series, goal, ...props }: DrawingProps) {
  const theme = useTheme(),
    geometry = plotGeometry(series, goal);
  const { width, height, loading } = props;
  const pad = space.sm;
  const x = (value: number) => pad + geometry.x(value) * (width - pad * 2);
  const y = (value: number) => pad + geometry.y(value) * (height - pad * 2);
  const rule = { strokeWidth: component.base.borderWidth, stroke: theme.line?.val };
  return (
    <Svg width={width} height={height} aria-hidden accessibilityElementsHidden>
      {geometry.ticks.map((value, index) => (
        <Line key={index} x1={pad} x2={width - pad} y1={y(value)} y2={y(value)} {...rule} />
      ))}
      {goal && Number.isFinite(goal.value) && (
        <Line
          x1={pad}
          x2={width - pad}
          y1={y(goal.value)}
          y2={y(goal.value)}
          stroke={theme[loading ? "line" : "muted"]?.val}
          strokeWidth={component.base.strongBorder}
          strokeDasharray={`${space.sm} ${space.xs}`}
        />
      )}
      {series.map((line) => (
        <Path
          key={line.id}
          d={plotPaths(line.points, x, y)}
          fill="none"
          stroke={theme[loading ? "line" : (line.tone ?? "accent")]?.val}
          strokeWidth={component.base.strongBorder}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      <PlotPoints series={series} {...props} {...(goal ? { goal } : {})} />
    </Svg>
  );
}
