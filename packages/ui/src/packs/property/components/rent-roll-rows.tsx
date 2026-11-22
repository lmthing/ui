import * as c from "../../../catalog";
import * as kit from "../../../kit";
import type { rentCopy } from "../copy";
import type { propertyWordsFor } from "../lang";
import type { meta, props } from "./RentRoll";

type RollProps = c.Props<typeof props, typeof meta>;
type Summary = ReturnType<ReturnType<typeof rentCopy>["summary"]>;
// prettier-ignore
function Datum({ part, role, text, density, strike, tone }: {
  part: string | null; role: "body" | "label" | "number"; text: string; density: c.ThemeDensity;
  strike?: boolean; tone?: kit.TextTone;
}) {
  return kit.useComponentState() === "loading" ?
    <kit.KitSkeleton shape="figure" inset="none" content={[[role, text, role === "number" ? "end" : "start", "compact"]]} {...{ density }} /> :
    <kit.KitText {...{ part, role, density }} tone={tone ?? "text"} strike={Boolean(strike)} numberScale="compact"
      align={role === "number" ? "end" : "start"} tabular={role === "number"}>{text}</kit.KitText>;
}
// prettier-ignore
function Metric({ part, label, value, density, tone = "text" }: {
  part: string; label: string; value: string; density: c.ThemeDensity; tone?: kit.TextTone;
}) {
  return <kit.KitGrid fitLast {...{ density }}>
    <kit.KitLayoutText line={{ text: label, role: "meta", tone: "muted" }} {...{ density }} />
    <kit.KitLayoutText line={{ text: value, part, role: "figure", compact: true, tabular: true, tone }} align="end" {...{ density }} />
  </kit.KitGrid>;
}

// prettier-ignore
export function RentSummary({ fields, density, tenant }: { fields: Summary; density: c.ThemeDensity; tenant: boolean }) {
  const focal = tenant ? fields.find(({ part }) => part === "outstanding") : undefined;
  return <kit.KitContent {...{ density }}>
    {focal && <kit.KitContent rhythm="flush" {...{ density }}>
      <kit.KitLayoutText line={{ text: focal.label, role: "meta", tone: "muted" }} {...{ density }} />
      <kit.KitLayoutText line={{ text: focal.value, part: focal.part, role: "figure", tone: "accent", tabular: true }} {...{ density }} />
    </kit.KitContent>}
    <kit.KitContent rhythm="flush" {...{ density }}>{fields.filter((field) => field !== focal).map((field) =>
      <Metric key={field.part} {...field} {...{ density }} tone={field.part === "outstanding" ? "accent" : "text"} />)}
    </kit.KitContent>
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
      <Datum part="due" role="label" tone="muted" text={due} {...{ density }} />
      <kit.KitContent group="response" rhythm="flush" {...{ density }}>
        {fields.map((field) => <Metric key={field.part} {...field} {...{ density }} />)}
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
      <kit.KitContent rhythm="flush" {...{ density }}>
        <Datum part="unit" role="body" text={line.unit} {...{ density }} />
        <Datum part="date" role="label" tone="muted" text={date} {...{ density }} />
        <Datum part="method" role="label" tone="muted" text={method} {...{ density }} />
      </kit.KitContent>
      <kit.KitContent {...{ density }}>
        <Datum part="amount" role="number" strike={line.voided} text={value} {...{ density }} />
        {line.voided && !loading ? <kit.KitTrail part="voided" kind="badge" tone="muted" value={words.voided} {...{ density }} /> :
          !tenant && <RentAction part="void" label={line.voided ? words.voided : words.void} kind="danger" {...{ loading }} />}
      </kit.KitContent>
    </kit.KitGrid>
  </kit.KitRow>;
}
