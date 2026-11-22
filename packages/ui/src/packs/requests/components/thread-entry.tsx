import type { ThemeDensity } from "../../../catalog";
import * as kit from "../../../kit";
import { threadEntryCopy } from "../copy";
import { requestsWordsFor } from "../lang";
import type { ThreadProps } from "./RequestThread";

type Finish = Pick<ThreadProps, "detail"> & { density: ThemeDensity };

// prettier-ignore
export function ThreadEntry({ row, detail, density, lang }: Finish & { row: ThreadProps["entries"][number] & { fileName?: string }; lang: string }) {
  const { event, fact, date, time, audience, fileLabel } = threadEntryCopy(row, detail, lang);
  const { photo: photoLabel } = requestsWordsFor(lang).thread;
  const loading = kit.useComponentState() === "loading";
  return <kit.KitRow {...(loading ? { part: null } : { item: row.id, goto: row.goto })}
    label={fact ?? event ?? row.by}
    density={row.kind === "message" ? "comfortable" : density}
    tone={row.kind === "message" ? "muted" : undefined}
    trailing={!loading && row.goto && <kit.KitIcon name="chevron_right" tone="muted" scale="sm" decorative />}>
    <kit.KitContent lineRole="body" density={density}>
      <kit.KitLayoutText line={{ text: event, role: "meta" }} />
      <kit.KitLayoutText line={{ text: fact, part: "event_detail" }} />
      <kit.KitLayoutText line={{ text: row.by, part: "by", role: event ? "caption" : "meta", tone: event ? "muted" : "text" }} />
      <kit.KitLayoutText line={{ text: row.text, part: "text" }} />
      {loading ? <kit.KitLayoutText line={{ text: `${time} ${date}`, role: "caption" }} /> : <kit.KitText part={null} role="caption" tone="muted">
        <kit.KitText part="time" role="caption" tone="muted" tabular>{time}</kit.KitText>{" "}
        <kit.KitText part="date" role="caption" tone="muted">{date}</kit.KitText>
      </kit.KitText>}
      <kit.KitLayoutText line={{ text: audience, part: "audience", role: "caption", tone: "muted" }} />
      {row.photo && <><kit.KitPhoto part={loading ? null : "photo"} photo={row.photo} label={photoLabel} loading={loading} />
        <kit.KitLayoutText line={{ text: photoLabel, role: "caption", tone: "muted" }} /></>}
      <kit.KitLayoutText line={{ text: fileLabel, part: "file", role: "caption", tone: "muted" }} density={density} />
    </kit.KitContent>
  </kit.KitRow>;
}
