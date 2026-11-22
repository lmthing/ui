import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { requestGroups, requestLines, requestSkeleton, type QueueRecord } from "../copy";
import { requestsWordsFor } from "../lang";

export type QueueRowProps = QueueRecord & { id: string; goto: string };

// prettier-ignore
function QueueRow({ row, now, density, grouped, loading }: {
  row: QueueRowProps; now: number; density: c.ThemeDensity; grouped: boolean; loading: boolean;
}) {
  const { lang, words: { queue } } = kit.useWords(requestsWordsFor);
  const line = requestLines(row, now, lang);
  const sub = { role: "caption", tone: "muted", density } as const, compact = density === "compact";
  if (loading) return <kit.KitRow part={null} label={row.title} inline>
    {requestSkeleton(row, line, grouped, compact, lang).map(({ key, ...entry }) => <kit.KitSkeleton key={key} shape="figure" inset="none" density={density} lines={[entry]} />)}
  </kit.KitRow>;
  const place = row.place && <kit.KitText part="place" {...sub}>{row.place}</kit.KitText>;
  const who = line.who && <kit.KitText part="who" {...sub}>{line.who}</kit.KitText>;
  return <kit.KitRow item={row.id} label={row.title} goto={row.goto} inline lineRole="heading" density="comfortable"
    trailing={<kit.KitIcon name="chevron_right" tone="muted" decorative scale="sm" />}>
    <kit.KitText part="title" role="heading" density="comfortable">{row.title}</kit.KitText>
    <kit.KitText part={null} {...sub}>
      <kit.KitText part="number" {...sub} tabular>{row.number}</kit.KitText>{queue.separator}
      <kit.KitText part="urgency" {...sub} tone={row.urgency === "urgent" ? "warn" : "muted"}>{line.urgency}</kit.KitText>
    </kit.KitText>
    <kit.KitText part="age" {...sub}>{line.age}</kit.KitText>
    {!grouped && <kit.KitText part="status" {...sub}>{line.status}</kit.KitText>}
    {compact && place && who ? <kit.KitText part={null} {...sub}>{place}{queue.separator}{who}</kit.KitText> : <>{place}{who}</>}
    {line.due && <kit.KitText part="due" {...sub} tone={line.overdue ? "bad" : "muted"}>{line.due}</kit.KitText>}
    {line.breach && <kit.KitRow part={null} inline inset="none" label={line.breach} leadingAlign="row"
      leading={<kit.KitTrail kind="badge" part="sla_breached" value={line.breach} tone="bad" density={density} />}>{null}</kit.KitRow>}
  </kit.KitRow>;
}

// prettier-ignore
export function QueueRows({ rows, now, density, grouped, personal, loading = false }: {
  rows: QueueRowProps[]; now: number; density: c.ThemeDensity; grouped: boolean; personal: boolean; loading?: boolean;
}) {
  const { words: { queue }, lang } = kit.useWords(requestsWordsFor);
  const groupedRows = requestGroups(rows, grouped);
  if (personal && grouped) return <kit.KitContent inset="md">
    <kit.KitColumns part={loading ? null : "status_heading"} style="stack" {...{ loading }}
      columns={groupedRows.flatMap(({ status, rows }) => status ? [{
        id: status, label: queue.status[status], count: c.numberLine(rows.length, lang),
        children: <kit.KitRowGroup separators={false} {...{ density }}>
          {rows.map((row) => <QueueRow key={row.id} {...{ row, now, density, grouped, loading }} />)}
        </kit.KitRowGroup>,
      }] : [])} />
  </kit.KitContent>;
  const groups = <kit.KitContent inset="md" group={density === "compact" ? "content" : "response"}>
    <kit.KitGrid arrange="rows" list listRowGap="cards" density={density}>
      {groupedRows.map(({ status, rows }, index) => <kit.KitContent key={status ?? "rows"} group={index ? "response" : "content"}>
        {status && (loading ? <kit.KitSkeleton shape="figure" inset="none" content={[["label", queue.status[status]]]} /> :
          <kit.KitText part={null} role="label" tone="muted">{queue.status[status]}</kit.KitText>)}
        <kit.KitGrid arrange="rows" list listRowGap="cards" density={density}>
          {rows.map((row) => <QueueRow key={row.id} {...{ row, now, density, grouped, loading }} />)}
        </kit.KitGrid>
      </kit.KitContent>)}
    </kit.KitGrid>
  </kit.KitContent>;
  return grouped && !loading ? <kit.KitCard style="plain" part="status_heading">{groups}</kit.KitCard> : groups;
}
