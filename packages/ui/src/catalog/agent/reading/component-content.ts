import { numberLine } from "../../format";
import type { Meta } from "../../meta";
import type { StateName } from "../../types";
import {
  parseAppCurrency,
  selectDeviceData,
  sessionKey,
  type AppCurrency,
  type DeviceData,
  type DrawState,
  type SessionState,
  type Values,
} from "../index";
import { hasRuntimeSets, projectLiveClocks } from "../clocks";
import { projectDraw, readDraw } from "../draw";
import { projectParsedControls } from "../live-props";
import { nestedRemaining, visibleNestedProps } from "../selection";
import { projectVisibleItems } from "../visibility";
import { componentTexts, type ReadSchema } from "./index";

type Props = Values;

function readingProps(
  meta: Meta,
  props: Props,
  instance: string,
  values: Props,
  live: Props,
  session?: SessionState,
) {
  const get = (part: string) => values[`${instance}/${part}`];
  const runtime = Boolean(get("$runtime"));
  const reading = projectParsedControls(meta, props, get, runtime);
  const timed = projectLiveClocks(meta, reading, get, runtime);
  const useLive =
    meta.live ||
    meta.select?.runtime ||
    meta.recordRuntime ||
    meta.linkedEdits ||
    meta.selectionBinding ||
    meta.items?.deviceData ||
    meta.items?.move?.derived ||
    meta.deviceDataFlags ||
    meta.items?.visibleWhen ||
    meta.items?.toggles ||
    hasRuntimeSets(meta) ||
    meta.items?.records ||
    Object.values(meta.selections ?? {}).some((s) => s.runtime);
  const projected = projectVisibleItems(
    meta,
    visibleNestedProps(meta, useLive ? live : projectDraw(meta, timed, get), get),
  );
  if (!session) return projected;
  const current =
    session.kind === "rounds"
      ? { [meta.session!.items]: session.recall && session.complete ? [] : [session.item] }
      : {};
  return { ...projected, ...current, [sessionKey]: session };
}

function readProgress(session: SessionState | undefined, lang?: string): string[] {
  const assessment = session?.kind === "rounds" && session.assessment;
  if (!assessment || assessment.correct === undefined) return [];
  const { right, of } = assessment.score;
  return [`correct ${assessment.correct}`, `score ${numberLine(right, lang)}/${numberLine(of, lang)}`];
}

/** A feedback view can use the solution without making it part of the agent's read. */
function sessionForRead(meta: Meta, session: SessionState | undefined) {
  const hidden = meta.session?.kind === "rounds" ? meta.session.assessment?.readHidden : undefined;
  if (!hidden?.length || session?.kind !== "rounds") return session;
  const item = Object.fromEntries(Object.entries(session.item).filter(([key]) => !hidden.includes(key)));
  return { ...session, item };
}

type Content = {
  props: Props;
  validated: Props;
  instance: string;
  values: Props;
  state: StateName;
  session: SessionState | undefined;
  draw: DrawState | undefined;
};
export function readContent(
  meta: Meta,
  schema: ReadSchema,
  { props, validated, instance, values, state, session, draw }: Content,
  {
    lang,
    deviceData,
    currency,
  }: {
    lang?: string | undefined;
    deviceData?: DeviceData | undefined;
    currency?: AppCurrency | undefined;
  },
) {
  const readable = sessionForRead(meta, session);
  const round = readable?.kind === "rounds" ? readable : undefined;
  const roundKey = round && meta.session?.items;
  const key = meta.items?.key === roundKey ? undefined : meta.items?.key;
  const remaining = nestedRemaining(meta, props);
  const own = [
    ...(meta.read?.(
      readingProps(meta, validated, instance, values, props, readable),
      state,
      lang,
      selectDeviceData(meta, deviceData),
      parseAppCurrency(currency),
    ) ?? []),
    ...readProgress(session, lang),
    ...readDraw(draw),
    ...(remaining === undefined ? [] : [`remaining ${numberLine(remaining, lang)}`]),
    ...componentTexts(schema, props, key, roundKey, round?.item),
  ];
  return { key, own };
}
