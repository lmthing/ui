import * as kit from "../../../kit";
import { threadEntryCopy } from "../copy";
import { requestsWordsFor } from "../lang";
import type { ThreadProps } from "./RequestThread";

type Finish = Pick<ThreadProps, "density" | "detail">;

// prettier-ignore
export function ThreadEntry({ row, detail, density, lang }: Finish & { row: ThreadProps["entries"][number]; lang: string }) {
  const { event, fact, date, time, audience } = threadEntryCopy(row, detail, lang);
  const { photo: photoLabel, file: fileLabel } = requestsWordsFor(lang).thread;
  return <kit.KitRow item={row.id} label={fact ?? event ?? row.by} goto={row.goto}
    density={row.kind === "message" ? "comfortable" : density}
    tone={row.kind === "message" ? "muted" : undefined}
    trailing={row.goto && <kit.KitIcon name="chevron_right" tone="muted" scale="sm" decorative />}>
    <kit.KitContent lineRole="body" density={density}>
      {event && <kit.KitText part={null} role="label">{event}</kit.KitText>}
      {fact && <kit.KitText part="event_detail" role="body">{fact}</kit.KitText>}
      <kit.KitText part="by" role={event ? "caption" : "label"} tone={event ? "muted" : "text"}>{row.by}</kit.KitText>
      {row.text && <kit.KitText part="text" role="body">{row.text}</kit.KitText>}
      <kit.KitText part={null} role="caption" tone="muted">
        <kit.KitText part="time" role="caption" tone="muted" tabular>{time}</kit.KitText>{" "}
        <kit.KitText part="date" role="caption" tone="muted">{date}</kit.KitText>
      </kit.KitText>
      <kit.KitText part="audience" role="caption" tone="muted">{audience}</kit.KitText>
      {row.photo && <><kit.KitPhoto part="photo" photo={row.photo} label={photoLabel} />
        <kit.KitText part={null} role="caption" tone="muted">{photoLabel}</kit.KitText></>}
      {row.file && <kit.KitLayoutText line={{ text: fileLabel, part: "file", role: "caption", tone: "muted" }} density={density} />}
    </kit.KitContent>
  </kit.KitRow>;
}
