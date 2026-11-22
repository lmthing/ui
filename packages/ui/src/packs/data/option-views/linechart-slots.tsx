import type { ThemeDensity } from "../../../catalog";
import * as kit from "../../../kit";
import { chartPoints, pointValue, seriesId, seriesTones } from "../copy";
import { dataWordsFor } from "../lang";

type ChartProps = { series: { label: string; values: number[] }[]; density?: ThemeDensity | undefined };
type Point = ReturnType<typeof chartPoints>[number];

// prettier-ignore
export function ChartLatest({ series, density, loading }: Pick<ChartProps, "series" | "density"> & { loading: boolean }) {
  const { words, lang } = kit.useWords(dataWordsFor);
  const summary = <kit.KitGrid columns={series.length === 3 ? 3 : 2} density={density}>
    {series.map(({ label, values }, index) => {
      const value = pointValue(values.at(-1)!, undefined, lang);
      return loading
      ? <kit.KitSkeleton key={index} shape="figure" inset="none" density={density}
          content={[["caption", label], ["number", value]]} />
      : <kit.KitContent key={index} density={density}>
          <kit.KitText role="caption" tone={seriesTones[index]!} part={null} lines={1}>{label}</kit.KitText>
          <kit.KitText role="number" part={null} density={density} tabular lines={1}>{value}</kit.KitText>
        </kit.KitContent>; })}
  </kit.KitGrid>;
  const caption = loading ? <kit.KitSkeleton shape="figure" inset="none" density={density}
    content={[["caption", words.chartLatest]]} /> : <kit.KitText part="latest" role="caption" tone="muted">{words.chartLatest}</kit.KitText>;
  return <kit.KitContent density={density}>{caption}{summary}</kit.KitContent>;
}

// prettier-ignore
export function ChartControls({ points, selected, title, loading }: { points: Point[]; selected?: Point | undefined; title: string; loading: boolean }) {
  const { words } = kit.useWords(dataWordsFor);
  const tracks = points.filter(({ x }) => x === 0).map(({ series, line }) => {
    const dates = points.filter((point) => point.line === line);
    const buttons = <kit.KitGrid columns={dates.length === 4 ? 2 : 3}>
      {dates.map(({ id, label }) => <kit.KitChip key={id} item={id} role="radio" look="box" labelPart={null}
        label={label} on={selected?.id === id} />)}
    </kit.KitGrid>;
    return (
    <kit.KitContent key={seriesId(line)} group={line ? "response" : "content"}>
      {loading ? <kit.KitSkeleton shape="figure" inset="none" content={[["caption", series]]} /> :
        <kit.KitText role="caption" tone={seriesTones[line]!} part={null}>{series}</kit.KitText>}
      {loading ? buttons : <kit.KitTrack part={`series_${line + 1}`} role="radiogroup" label={words.chartSeriesPoints(series)}>{buttons}</kit.KitTrack>}
    </kit.KitContent>
  ); });
  return loading ? <kit.KitContent>{tracks}</kit.KitContent> : points.length > 12
    ? <kit.KitScroll part="points" label={words.chartPoints(title)}>{tracks}</kit.KitScroll>
    : <kit.KitRow part="points" inline role="group" label={words.chartPoints(title)}>{tracks}</kit.KitRow>;
}
