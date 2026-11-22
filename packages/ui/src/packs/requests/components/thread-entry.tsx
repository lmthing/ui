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
  const state = kit.useComponentState(), loading = state === "loading", message = row.kind === "message";
  const goto = !loading && state !== "error" ? row.goto : undefined;
  const meta = { role: "caption", tone: "muted" } as const;
  return <kit.KitRow {...(loading ? { part: null } : { item: row.id })} goto={goto}
    label={fact ?? event ?? row.by}
    density="compact" tone={message ? "muted" : undefined}>
    <kit.KitContent lineRole="body" density={density} rhythm="flush">
      {event && <kit.KitRow part={null} label={event} inline fitContent lineRole="label"
        trailing={row.goto && state !== "error" && <kit.KitIcon name="chevron_right" tone="muted" scale="sm" decorative loading={loading} />}>
        <kit.KitLayoutText line={{ text: event, role: "meta", strong: true }} />
      </kit.KitRow>}
      <kit.KitLayoutText line={{ text: fact, part: "event_detail" }} />
      <kit.KitLayoutText line={{ text: row.text, part: "text" }} />
      <kit.KitGrid fitLast density={density}>
        <kit.KitLayoutText line={{ text: row.by, part: "by", ...meta }} />
        <kit.KitLayoutText line={{ text: audience, part: "audience", ...meta }} align="end" />
      </kit.KitGrid>
      {loading ? <kit.KitLayoutText line={{ text: `${time} ${date}`, ...meta }} />
        : <kit.KitText part={null} {...meta}>
        <kit.KitText part="time" {...meta} tabular>{time}</kit.KitText>{" "}
        <kit.KitText part="date" {...meta}>{date}</kit.KitText>
      </kit.KitText>}
      {row.photo && <kit.KitGrid fitLast density={density}>
        <kit.KitLayoutText line={{ text: photoLabel, ...meta }} />
        <kit.KitPhoto part={loading ? null : "photo"} photo={row.photo} label={photoLabel} loading={loading} />
      </kit.KitGrid>}
      <kit.KitLayoutText line={{ text: fileLabel, part: "file", role: "caption", tone: "muted" }} density={density} />
    </kit.KitContent>
  </kit.KitRow>;
}
