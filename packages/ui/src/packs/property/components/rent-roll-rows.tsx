import * as c from "../../../catalog";
import * as kit from "../../../kit";
import type { rentCopy } from "../copy";
import type { propertyWordsFor } from "../lang";
import type { meta, props } from "./RentRoll";

type RollProps = c.Props<typeof props, typeof meta>;
// prettier-ignore
export function Datum({ part, role, text, density, strike, tone }: {
  part: string | null; role: "title" | "body" | "caption" | "number"; text: string; density: c.ThemeDensity;
  strike?: boolean; tone?: kit.TextTone;
}) {
  return kit.useComponentState() === "loading" ?
    <kit.KitSkeleton shape="figure" inset="none" content={[[role, text, role === "number" ? "end" : "start", "compact"]]} {...{ density }} /> :
    <kit.KitText {...{ part, role, density }} tone={tone ?? "text"} strike={Boolean(strike)} numberScale="compact"
      align={role === "number" ? "end" : "start"} tabular={role === "number"}>{text}</kit.KitText>;
}
// prettier-ignore
export function Metric({ part, label, value, density, focal = false }: {
  part: string; label: string; value: string; density: c.ThemeDensity; focal?: boolean;
}) {
  const tone = focal ? "accent" : "text";
  return <kit.KitContent rhythm="flush" {...{ density }}>
    <kit.KitLayoutText line={{ text: label, role: "caption", tone: "muted" }} align="end" {...{ density }} />
    <kit.KitLayoutText line={{ text: value, part, role: "figure", compact: true, tabular: true, tone }} align="end" {...{ density }} />
  </kit.KitContent>;
}

type Line = RollProps["lines"][number];
// prettier-ignore
type Finish = { density: c.ThemeDensity; copy: ReturnType<typeof rentCopy>; words: ReturnType<typeof propertyWordsFor>["rentRoll"]; loading: boolean; tenant: boolean };
// prettier-ignore
function RentAction({ loading, kind, label, part, goto }: { loading: boolean; kind: kit.ActionKind; label: string; part: string; goto?: string }) {
  return loading ? <kit.KitSkeleton shape="control" {...{ kind, label }} /> : <kit.KitAction {...{ kind, label, part, goto }} />;
}
// prettier-ignore
export function ChargeRow({ line, density, copy, words, loading, tenant }: Finish & { line: Extract<Line, { kind: "charge" }> }) {
  const { due, fields } = copy.charge(line);
  return <kit.KitRow item={line.id} part={loading ? null : "root"} inline label={line.unit} {...{ density }}>
    <kit.KitContent {...{ density }}>
      <Datum part="unit" role="body" text={line.unit} {...{ density }} />
      <Datum part="occupant" role="body" tone="muted" text={line.occupant} {...{ density }} />
      <Datum part="due" role="caption" tone="muted" text={due} {...{ density }} />
      <kit.KitContent group="response" {...{ density }}>
        <kit.KitGrid columns={3} {...{ density }}>{fields.map((field) => <Metric key={field.part} {...field} {...{ density }} />)}</kit.KitGrid>
      </kit.KitContent>
      {tenant ? (line.unpaid && <kit.KitActionFooter {...{ density }}>
        <RentAction part="pay" label={words.pay} kind="primary" {...{ loading }} />
      </kit.KitActionFooter>) : <kit.KitContent group="response" {...{ density }}>
        <kit.KitGrid fitLast {...{ density }}>
          <RentAction part="record" label={words.record} goto={line.record.goto} kind="secondary" {...{ loading }} />
          {line.unpaid && <RentAction part="remind" label={words.remind} kind="quiet" {...{ loading }} />}
        </kit.KitGrid>
      </kit.KitContent>}
    </kit.KitContent>
  </kit.KitRow>;
}
// prettier-ignore
export function ReceiptRow({ line, density, copy, words, loading, tenant }: Finish & { line: Extract<Line, { kind: "receipt" }> }) {
  const { date, method, value } = copy.receipt(line);
  return <kit.KitRow item={line.id} part={loading ? null : "root"} inline label={line.unit} {...{ density }}>
    <kit.KitGrid fitLast {...{ density }}>
      <kit.KitContent {...{ density }}>
        <Datum part="unit" role="body" text={line.unit} {...{ density }} />
        <Datum part="amount" role="number" strike={line.voided} text={value} {...{ density }} />
        <Datum part="date" role="caption" tone="muted" text={date} {...{ density }} />
        <Datum part="method" role="caption" tone="muted" text={method} {...{ density }} />
      </kit.KitContent>
      {line.voided && !loading ? <kit.KitTrail part="voided" kind="badge" tone="muted" value={words.voided} {...{ density }} /> :
        !tenant && <RentAction part="void" label={line.voided ? words.voided : words.void} kind="danger" {...{ loading }} />}
    </kit.KitGrid>
  </kit.KitRow>;
}
