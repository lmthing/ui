import { z } from "zod";
import { numberLine, type Meta, type RecordContext, type RecordRuntime } from "../../../catalog";
import { buildHistory, planLedgerOperation } from "./history";
import { activity, dividends, holdings, performance } from "./projections";
import { invalid, performanceSample, time, type LedgerOperation, type LedgerResult } from "./records";
export const portfolioKind = "investment_portfolios";
const base = { kind: portfolioKind, scope: "portfolioId" } as const;
const deviceData = [portfolioKind] as const;
type Declaration = Pick<Meta, "deviceData" | "recordRuntime" | "read" | "emptyActions">;
type Row = Readonly<Record<string, unknown>>;

function history({ props, data, journal, now }: RecordContext) {
  const candidates = data[portfolioKind]?.filter(
    (record) =>
      record &&
      typeof record === "object" &&
      "portfolioId" in record &&
      record.portfolioId === props.portfolioId,
  );
  if (candidates?.length !== 1) return invalid("Expected one host statement for this portfolio");
  return buildHistory(candidates[0], journal, now);
}

function view<T>(key: string, result: LedgerResult<T>, format: (value: T) => Row) {
  return result.ok ? format(result.value) : { [key]: [], state: "error", ledgerError: result.error };
}

function rows(key: string, entries: readonly Row[], empty = !entries.length) {
  return { [key]: entries, ...(empty ? { state: "empty" } : {}) };
}
function readRows(key: string, describe: (row: Row, props: Row, lang?: string) => string) {
  return (input: unknown, _state: string, lang?: string) => {
    const props = input as Row;
    return (props[key] as readonly Row[]).map((row) => `${row.id}: ${describe(row, props, lang)}`);
  };
}
const measured = (value: unknown, lang?: string) =>
  typeof value === "number" ? numberLine(value, lang) : "unknown";

export const holdingsLedger = {
  deviceData,
  recordRuntime: {
    ...base,
    project(context) {
      const ledger = history(context);
      const asset = context.props.assetId;
      const positions = ledger.ok
        ? holdings(ledger.value, typeof asset === "string" ? asset : undefined)
        : ledger;
      return view("positions", positions, ({ positions, cash, totalValue }) => ({
        ...rows(
          "positions",
          positions.slice(0, 6).map((row) => ({
            ...row,
            visible: true,
            linked: Boolean(row.goto),
          })),
        ),
        cash,
        totalValue,
        positionCount: positions.length,
      }));
    },
  },
  read: readRows("positions", (r, props, lang) => {
    const value = `units ${measured(r.units, lang)}, value ${measured(r.value, lang)}`;
    return props.detail === "brief"
      ? value
      : `${value}, unit cost ${measured(r.unitCost, lang)}, gain ${measured(r.gain, lang)}${r.quotedAt ? ` at ${r.quotedAt}` : ""}`;
  }),
} satisfies Declaration;

function rangeStart(last: string, range: unknown) {
  if (range !== "month" && range !== "year") return -Infinity;
  const start = new Date(last);
  const day = start.getUTCDate();
  start.setUTCDate(1);
  start.setUTCMonth(start.getUTCMonth() - (range === "month" ? 1 : 12));
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1, 0);
  start.setUTCDate(Math.min(day, end.getUTCDate()));
  return start.getTime();
}

export const performanceLedger = {
  deviceData,
  emptyActions: ["range.select"],
  recordRuntime: {
    ...base,
    project(context) {
      const ledger = history(context);
      const samples = z
        .array(performanceSample.extend({ id: z.string().optional() }))
        .safeParse(context.props.samples);
      const result = !ledger.ok
        ? ledger
        : samples.success
          ? performance(
              ledger.value,
              samples.data.map(({ id: _id, ...sample }) => sample),
            )
          : invalid("Invalid performance samples");
      return view("samples", result, (points) => {
        const latest = points.at(-1);
        const start = latest ? rangeStart(latest.at, context.props.range) : Infinity;
        const visible = points.filter(({ at }) => time(at) >= start);
        return {
          ...rows("samples", visible, visible.filter(({ value }) => value !== null).length < 2),
          value: latest?.value ?? null,
          contributed: latest?.contributed ?? null,
          gain: latest?.gain ?? null,
        };
      });
    },
  },
  read: readRows(
    "samples",
    (r, _props, lang) =>
      `${r.at}: value ${measured(r.value, lang)}, contributed ${measured(r.contributed, lang)}, gain ${measured(r.gain, lang)}`,
  ),
} satisfies Declaration;

function press(kind: LedgerOperation["kind"]): NonNullable<RecordRuntime["presses"]>[string] {
  return {
    target: (row) => JSON.stringify([row.recordId, row.revision, time(String(row.receivedAt ?? row.at))]),
    plan(context, row) {
      const ledger = history(context);
      if (!ledger.ok) return ledger;
      const id = String(row.recordId);
      const at = new Date(context.now).toISOString();
      const revision = Number(row.revision);
      const op: LedgerOperation =
        kind === "reverse"
          ? { kind, id, at, revision, receiptAt: String(row.receivedAt) }
          : kind === "receive"
            ? { kind, id, at, revision: revision + 1 }
            : { kind, id, at };
      const plan = planLedgerOperation(ledger.value.portfolio, context.journal, op, context.now);
      return plan.ok ? { operation: plan.value } : plan;
    },
  };
}

export const dividendsLedger = {
  deviceData,
  recordRuntime: {
    ...base,
    project(context) {
      return view("distributions", history(context), (ledger) => {
        let projected = dividends(ledger).map((row) => ({
          ...row,
          received: Boolean(row.receivedAt),
          visible: true,
          linked: Boolean(row.goto),
          receive: row.canReceive ? true : undefined,
          void: row.canReverse ? true : undefined,
        }));
        if (context.props.style === "received")
          projected = projected
            .filter((row) => row.received)
            .sort((a, b) => time(b.receivedAt!) - time(a.receivedAt!));
        return rows("distributions", projected.slice(0, 6));
      });
    },
    presses: { receive: press("receive"), void: press("reverse") },
  },
  read: readRows(
    "distributions",
    (r, _props, lang) =>
      `${r.payOn}: entitled units ${measured(r.entitledUnits, lang)}, gross ${measured(r.gross, lang)}, net ${measured(r.net, lang)}${r.receivedAt ? `, received ${r.receivedAt}` : ""}`,
  ),
} satisfies Declaration;
export const activityLedger = {
  deviceData,
  recordRuntime: {
    ...base,
    project(context) {
      return view("entries", history(context), (ledger) => {
        const all = activity(ledger);
        return {
          ...rows(
            "entries",
            all.slice(-20).map((row) => ({
              ...row,
              linked: Boolean(row.goto),
              void: row.canVoid ? true : undefined,
            })),
          ),
          entryCount: all.length,
        };
      });
    },
    presses: { void: press("void") },
  },
  read: readRows(
    "entries",
    (r, _props, lang) =>
      `${r.at} ${r.kind}: cash movement ${measured(r.movement, lang)}${r.voided ? " (voided)" : ""}`,
  ),
} satisfies Declaration;
