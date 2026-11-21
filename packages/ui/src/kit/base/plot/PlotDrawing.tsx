import { useTheme } from "tamagui";
import { Svg, Path, Line, Circle } from "react-native-svg";
import { component, space } from "../../../catalog";
import { bandPath, plotPaths, type LinePlotProps, type plotGeometry } from "./linePlotGeometry";

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

export function PlotDrawing({ series, goal, baseline, geometry, ...props }: DrawingProps) {
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
