import { useState } from "react";
import { ScrollView, XStack, YStack } from "tamagui";
import { component, emptyLine, radius, size, space, type as typography } from "../../../catalog";
import { PartContext, useEmptyThing, usePart, usePartContext } from "../../part";
import { useKitStyle, useWords } from "../../provider";
import { KitIcon, KitText, shifted, useTextStep } from "../text";

type Level = { level: number; label: string };
type Cell = { id: string } & Level;
type Axis = { id: string; label: string };
type Row = Axis & { cells: readonly Cell[] };
type HeatGridProps = {
  part?: string;
  loading?: boolean;
  rows: readonly Row[];
  columns: readonly Axis[];
  legend: readonly Level[];
  style: "weeks" | "hours";
};
type MarkProps = { max: number; loading: boolean; box: number };
type LabelProps = { label: string; loading: boolean; align?: "start" | "center" };
type PlotProps = Pick<HeatGridProps, "rows" | "columns"> & MarkProps;
type LegendProps = Pick<HeatGridProps, "legend"> & Omit<MarkProps, "box">;
type ThumbProps = { content: number; view: number; offset: number; loading: boolean };
const axes = (length: number) => Array.from({ length }, (_, id) => ({ id: String(id), label: "" }));
function positive(level: number) {
  return Number.isFinite(level) ? Math.max(level, 0) : 0;
}
function heatMax({ legend, rows, columns }: HeatGridProps) {
  const top = legend.reduce((max, { level }) => Math.max(max, positive(level)), 0);
  if (top) return top;
  let max = 0;
  for (const row of rows)
    for (const { level } of row.cells.slice(0, columns.length)) max = Math.max(max, positive(level));
  return max;
}
function HeatMark({ level, max, loading, box, label }: MarkProps & { level: number; label?: string }) {
  const { radiusShift } = useKitStyle();
  const address = usePart("root", label !== undefined);
  const semantics =
    label === undefined
      ? { "aria-hidden": true }
      : { ...address, accessibilityRole: "image" as const, accessibilityLabel: label };
  const ratio = max > 0 ? Math.min(positive(level) / max, 1) : 0;
  const floor = component.base.shareFloor;
  return (
    <YStack
      {...semantics}
      height={box}
      width={box}
      borderRadius={shifted("sm", radiusShift)}
      backgroundColor={loading ? "$line" : ratio ? "$accent" : "$raised"}
      opacity={loading || !ratio ? 1 : floor + (1 - floor) * ratio}
      borderWidth={component.base.borderWidth}
      borderColor={!loading && ratio ? "$accent" : "$line"}
    />
  );
}
function HeatCell({ cell, max, box, loading }: MarkProps & { cell: Cell | undefined }) {
  const context = usePartContext();
  if (loading) return <HeatMark level={0} max={max} box={box} loading />;
  if (!cell) return <YStack width={box} height={box} aria-hidden />;
  return (
    <YStack>
      <PartContext.Provider value={{ ...context, item: cell.id }}>
        <HeatMark level={cell.level} label={cell.label} max={max} box={box} loading={false} />
      </PartContext.Provider>
    </YStack>
  );
}
function HeatLabel({ label, loading, align = "start" }: LabelProps) {
  const { radiusShift } = useKitStyle();
  const step = useTextStep({});
  return loading ? (
    <YStack
      width={size.icon.lg}
      height={space.xs}
      marginVertical={(typography[step("caption")].lineHeight - space.xs) / 2}
      alignSelf={align === "center" ? "center" : "flex-start"}
      backgroundColor="$line"
      borderRadius={shifted("sm", radiusShift)}
      aria-hidden
    />
  ) : (
    <KitText role="caption" tone="muted" align={align} lines={1} tabular part={null}>
      {label}
    </KitText>
  );
}
function HeatLegend({ legend, max, loading }: LegendProps) {
  if (!legend.length) return null;
  return (
    <XStack flexWrap="wrap" columnGap={space.sm} rowGap={space.xs} aria-hidden={loading || undefined}>
      {legend.map(({ label, level }, index) => (
        <XStack key={index} gap={space.xs} alignItems="center">
          <HeatMark level={level} max={max} box={size.icon.sm} loading={loading} />
          <HeatLabel label={label} loading={loading} />
        </XStack>
      ))}
    </XStack>
  );
}

function HeatThumb({ content, view, offset, loading }: ThumbProps) {
  return (
    <YStack height={space.xs} backgroundColor="$line" borderRadius={radius.pill} aria-hidden>
      <YStack
        position="absolute"
        height="100%"
        width={(view / content) * view}
        left={(Math.max(0, Math.min(offset, content - view)) / content) * view}
        backgroundColor={loading ? "$line" : "$muted"}
        borderRadius={radius.pill}
      />
    </YStack>
  );
}
function HeatPlot({ rows, columns, loading, box, max }: PlotProps) {
  const header = typography[useTextStep({})("caption")].lineHeight;
  const gap = space.xs;
  const [view, setView] = useState<number>(0);
  const [offset, setOffset] = useState<number>(0);
  const content = columns.length * (box + gap) - gap;
  const overflow = view > 0 && content > view;
  return (
    <XStack gap={space.sm} aria-hidden={loading || undefined}>
      <YStack width={size.avatar.sm} gap={gap} paddingTop={header + gap}>
        {rows.map((row) => (
          <YStack key={row.id} height={box} justifyContent="center">
            <HeatLabel label={row.label} loading={loading} />
          </YStack>
        ))}
      </YStack>
      <YStack flex={component.base.bodyFlex} minWidth={component.base.none} gap={gap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEnabled={!loading}
          tabIndex={!loading && overflow ? 0 : -1}
          onLayout={(event) => setView(event.nativeEvent.layout.width)}
          onScroll={(event) => setOffset(event.nativeEvent.contentOffset.x)}
        >
          <YStack gap={gap}>
            <XStack gap={gap} height={header}>
              {columns.map((column) => (
                <YStack key={column.id} width={box}>
                  <HeatLabel label={column.label} loading={loading} align="center" />
                </YStack>
              ))}
            </XStack>
            {rows.map((row) => (
              <XStack key={row.id} gap={gap}>
                {columns.map(({ id }, index) => (
                  <HeatCell key={id} cell={row.cells[index]} max={max} box={box} loading={loading} />
                ))}
              </XStack>
            ))}
          </YStack>
        </ScrollView>
        {overflow && <HeatThumb {...{ content, view, offset, loading }} />}
      </YStack>
    </XStack>
  );
}

/** Caller-supplied heat levels and scale. Cells are addressed for reading, not controls. */
export function KitHeatGrid(props: HeatGridProps) {
  const { part = "root", loading = false, style, rows, columns, legend } = props;
  const { lang } = useWords();
  const thing = useEmptyThing();
  const ks = useKitStyle();
  const empty = !columns.length || !rows.some(({ cells }) => cells.length);
  const max = loading ? 0 : heatMax(props);
  return (
    <YStack {...usePart(part)} width="100%" gap={space[ks.density.rowPad]} aria-busy={loading}>
      {empty && !loading ? (
        <YStack alignItems="center" gap={space.md} paddingVertical={space.xl}>
          <KitIcon name="sparkles" tone="muted" scale="lg" decorative />
          <KitText part={null} tone="muted" align="center">
            {emptyLine(thing, lang)}
          </KitText>
        </YStack>
      ) : (
        <>
          <HeatPlot
            rows={rows.length ? rows : axes(7).map((row) => ({ ...row, cells: [] }))}
            columns={columns.length ? columns : axes(style === "weeks" ? 6 : 12)}
            box={style === "weeks" ? size.avatar.sm : size.control.md}
            max={max}
            loading={loading}
          />
          <HeatLegend legend={legend} max={max} loading={loading} />
        </>
      )}
    </YStack>
  );
}
