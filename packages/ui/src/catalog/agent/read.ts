import { liveProps, localValues, parseControlProps } from "./live-props";
import { z } from "zod";
import type { Definition } from "../probes";
import type { StateName, Tier } from "../types";
import { formatAffordance } from "./affordances";
import { visibleNestedProps } from "./selection";
import { parseAppCurrency, type AppCurrency } from "./app-currency";
import { drawState, drawStatus, readDraw } from "./draw";
import { buzzStatus } from "./buzz";
import { sessionState, sessionStatus } from "./session";
import { migrateScreen } from "../migrations";
import {
  migrateInput,
  readAffordances,
  readContent,
  readItems,
  readOffers,
  redactSecretProps,
  variantsOf,
  type ReadSchema as Json,
} from "./reading";
import {
  disabledSelectionChecks,
  projectSelectionBinding,
  selectionBindingFor,
  type BoundSelection,
} from "./selection-binding";
import { driveTarget, projectDriveObservation, type CanDrive } from "./drives";
import { captureDeviceTime, isDeviceDataVisible, projectDeviceData, type DeviceData } from "./device-data";
import { withRecordScreen } from "./record-runtime";
import { redactPrivateMarks } from "./private-controls";
import {
  formatHostOperations,
  hostActionPolicy,
  readHostOperations,
  type HostActionPolicy,
} from "./host-commands";
import { projectDataViewList, resolveDataViews } from "./data-view";

type Props = Record<string, unknown>;

const quote = (value: string) => JSON.stringify(value);

function formatReading(
  meta: Definition["meta"],
  schema: Json,
  content: Parameters<typeof readContent>[2],
  copy: Parameters<typeof readContent>[3],
  head: string,
  affordances: ReturnType<typeof readAffordances>,
  operations: string[],
  get: (part: string) => unknown,
) {
  const { state, props, session, draw, instance, summaryOnly } = content;
  const feedback = state === "error" && session?.kind === "rounds" && session.assessment?.correct === false;
  const successContent = state === "success" && (draw || session || meta.readSuccess);
  if (state !== "filled" && !feedback && !summaryOnly && !successContent) {
    const summary =
      state === "empty"
        ? readDraw(draw)
        : state === "error" && meta.readError
          ? readContent(meta, schema, content, copy).own
          : [];
    return [[head, ...summary, ...affordances.map(formatAffordance)].join(" "), ...operations];
  }
  const { key, own } = readContent(meta, schema, content, copy);
  const nested = visibleNestedProps(meta, props, get);
  return [
    ...readItems(
      meta,
      schema,
      nested,
      instance,
      key,
      head,
      own,
      affordances,
      get("more") === true,
      copy.lang,
    ),
    ...operations,
  ];
}

/** Read addressed text and affordances, without styling or secrets (plan 4.12). */
export function readComponent(
  def: Definition,
  input: unknown,
  instance: string,
  state: StateName = "filled",
  runtimeValues: Record<string, unknown> = {},
  lang?: string,
  deviceData?: DeviceData,
  currency?: AppCurrency,
  selection?: BoundSelection,
  target?: ReturnType<typeof driveTarget>,
  host?: HostActionPolicy,
  views?: ReturnType<typeof resolveDataViews>,
): string[] {
  const { meta } = def;
  if (meta.selectionBinding?.requireSelection && !selection?.selected.length) return [];
  const { values, addresses } = redactPrivateMarks(runtimeValues);
  deviceData = projectDeviceData(deviceData, values);
  if (!isDeviceDataVisible(meta, deviceData)) return [];
  const get = (part: string) => values[`${instance}/${part}`];
  const migrated = migrateInput(meta.id, input);
  const validated = parseControlProps(def, migrated, get);
  const live = liveProps(meta, validated, instance, values, true, deviceData);
  const observed = projectDriveObservation(
    meta,
    projectSelectionBinding(meta, live, selection),
    instance,
    target,
  );
  const presentation = views ? projectDataViewList(views, instance, observed, state) : { props: observed };
  const { props, empty } = presentation;
  if (empty) return [`${instance} ${meta.id} (empty) ${quote(empty)}`];
  const base = drawStatus(meta, props, (props.state as StateName | undefined) ?? state, get);
  state = buzzStatus(meta, props, sessionStatus(meta, props, base, get), get);
  const schema = z.toJSONSchema(def.props, { io: "input", unrepresentable: "any" }) as Json;
  const head = `${instance} ${meta.id}${variantsOf(schema, redactSecretProps(schema, props))}${state === "filled" ? "" : ` (${state})`}`;
  const draw = drawState(def.meta, props, get),
    session = sessionState(meta, props, get);
  const options = { addresses, deviceData, target, host };
  const offered = readOffers(def, migrated, instance, props, state, values, options);
  const operations = readHostOperations(meta, props, instance, host, get("more") === true);
  const affordances = readAffordances(offered, values, def, props, instance, session);
  const optedIn = (state === "empty" || state === "success") && meta.readInState?.(props, state);
  const content = {
    props,
    validated: views?.lists.has(instance)
      ? projectDataViewList(views, instance, validated, state).props
      : validated,
    instance,
    values,
    state,
    session,
    draw,
    hostOperations: operations,
    summaryOnly: !!optedIn,
  };
  const copy = { lang, deviceData, currency };
  const hostLines = formatHostOperations(instance, operations);
  return formatReading(meta, schema, content, copy, head, affordances, hostLines, get);
}

export type ScreenLike = {
  id: string;
  title?: string;
  tier?: Tier;
  components: ({ id: string; c: string; state?: StateName } & Props)[];
  [disabledSelectionChecks]?: Pick<ReadonlySet<string>, "has">;
  [hostActionPolicy]?: HostActionPolicy;
};

/** A whole screen as text, for a model to read before acting. */
export function readScreen(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  values: Record<string, unknown> = {},
  lang?: string,
  deviceData?: DeviceData,
  currency?: AppCurrency,
  canDrive?: CanDrive,
  decorate?: (def: Definition, id: string, values: Props) => Definition,
): string {
  const appCurrency = parseAppCurrency(currency);
  const migrated = migrateScreen(screen, { variantOnly: true, includeSavedRing: true });
  deviceData = withRecordScreen(captureDeviceTime(defs, deviceData), migrated);
  const snapshot = projectDeviceData(deviceData, redactPrivateMarks(values).values);
  const local = localValues(screen.id, values);
  const { values: safe, addresses } = redactPrivateMarks(local);
  const views = resolveDataViews(migrated, defs, safe, (c) => isDeviceDataVisible(defs[c]!.meta, snapshot));
  const header = `screen ${screen.id}${screen.title ? ` ${quote(screen.title)}` : ""}`;
  const lines = migrated.components.flatMap(({ id, c, state, ...props }) => {
    if (views.hidden.has(id)) return [];
    const def = defs[c];
    if (!def) return [`${id} ${c} (unknown)`];
    const selection = selectionBindingFor(migrated, defs, def.meta, id, safe, snapshot, addresses)?.view;
    const target = driveTarget(def.meta, migrated, defs, safe, snapshot, canDrive, addresses);
    const lines = readComponent(
      decorate?.(def, id, safe) ?? def,
      props,
      id,
      state,
      local,
      lang,
      deviceData,
      appCurrency,
      selection,
      target,
      migrated[hostActionPolicy],
      views,
    );
    const empty = views.empty.get(id);
    return empty ? [...lines, `${id}/results ${quote(empty)}`] : lines;
  });
  return [header, ...lines].join("\n");
}
