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
import { hasRecordClock, hasRuntimeSets, hasTimestampClock, projectLiveClocks } from "../clocks";
import { projectDraw, readDraw } from "../draw";
import { projectParsedControls } from "../live-props";
import { hasNestedCollectionControls } from "../nested";
import { nestedRemaining, visibleNestedProps } from "../selection";
import { projectVisibleItems } from "../visibility";
import { componentTexts, readProgress, type ReadSchema } from "./index";
import { redactCustomReadProps, roundHide, sessionForRead } from "./secret-props";

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
    meta.buzz ||
    meta.localState ||
    meta.sequence ||
    meta.dateSpan ||
    meta.collections ||
    hasNestedCollectionControls(meta) ||
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
    hasRecordClock(meta) ||
    hasTimestampClock(meta) ||
    (typeof meta.drives === "object" && meta.drives.observe) ||
    meta.items?.records ||
    Object.values(meta.selections ?? {}).some((s) => s.runtime);
  const projected = projectVisibleItems(
    meta,
    visibleNestedProps(meta, useLive ? live : projectDraw(meta, timed, get), get),
  );
  if (!session) return projected;
  const current =
    session.kind === "rounds"
      ? {
          [meta.session!.items]:
            session.complete && (session.recall || roundHide(meta)) ? [] : [session.item],
        }
      : {};
  return { ...projected, ...current, [sessionKey]: session };
}

type Content = {
  props: Props;
  validated: Props;
  instance: string;
  values: Props;
  state: StateName;
  session: SessionState | undefined;
  draw: DrawState | undefined;
  summaryOnly: boolean;
};
export function readContent(
  meta: Meta,
  schema: ReadSchema,
  { props, validated, instance, values, state, session, draw, summaryOnly }: Content,
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
  const get = (part: string) => values[`${instance}/${part}`];
  const readable = sessionForRead(meta, schema, session);
  const round = readable?.kind === "rounds" ? readable : undefined;
  const roundKey = round && meta.session?.items;
  const key = summaryOnly || meta.items?.key === roundKey ? undefined : meta.items?.key;
  const remaining = nestedRemaining(meta, props);
  const own = [
    ...(meta.read?.(
      redactCustomReadProps(
        meta,
        schema,
        readingProps(meta, validated, instance, values, props, readable),
        lang,
      ),
      state,
      lang,
      selectDeviceData(meta, deviceData),
      parseAppCurrency(currency),
      get,
    ) ?? []),
    ...readProgress(session, lang),
    ...readDraw(draw),
    ...(remaining === undefined ? [] : [`remaining ${numberLine(remaining, lang)}`]),
    ...componentTexts(
      schema,
      meta.id === "Camera" && props.kind === "document_dual" && Number(get("$adjust/side") ?? 0) > 0
        ? { ...props, hint: undefined }
        : props,
      key,
      roundKey,
      round?.item,
    ),
  ];
  return { key, own };
}
