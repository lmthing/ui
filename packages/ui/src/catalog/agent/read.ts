import { liveProps, localValues, parseControlProps } from "./live-props";
import { z } from "zod";
import type { Definition } from "../probes";
import type { StateName } from "../types";
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
import { hostActionPolicy, readHostOperations, type HostActionPolicy } from "./host-commands";

type Props = Record<string, unknown>;

const quote = (value: string) => JSON.stringify(value);
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
  const props = projectDriveObservation(
    meta,
    projectSelectionBinding(meta, live, selection),
    instance,
    target,
  );
  const base = drawStatus(meta, props, (props.state as StateName | undefined) ?? state, get);
  state = buzzStatus(meta, props, sessionStatus(meta, props, base, get), get);
  const schema = z.toJSONSchema(def.props, { io: "input", unrepresentable: "any" }) as Json;
  const head = `${instance} ${meta.id}${variantsOf(schema, redactSecretProps(schema, props))}${state === "filled" ? "" : ` (${state})`}`;
  const draw = drawState(def.meta, props, get),
    session = sessionState(meta, props, get);
  const offered = readOffers(def, migrated, instance, props, state, values, {
    addresses,
    deviceData,
    target,
    host,
  });
  const operations = readHostOperations(meta, props, instance, host, get("more") === true);
  const affordances = readAffordances(offered, values, def, props, instance, session);
  const feedback = state === "error" && session?.kind === "rounds" && session.assessment?.correct === false;
  const optedIn = (state === "empty" || state === "success") && meta.readInState?.(props, state);
  const successContent = state === "success" && (draw || session || meta.readSuccess);
  if (state !== "filled" && !feedback && !optedIn && !successContent)
    return [
      [head, ...(state === "empty" ? readDraw(draw) : []), ...affordances.map(formatAffordance)].join(" "),
      ...operations,
    ];
  const content = { props, validated, instance, values, state, session, draw, summaryOnly: !!optedIn };
  const { key, own } = readContent(meta, schema, content, { lang, deviceData, currency });
  const nested = visibleNestedProps(meta, props, get);
  return [
    ...readItems(meta, schema, nested, instance, key, head, own, affordances, get("more") === true, lang),
    ...operations,
  ];
}

export type ScreenLike = {
  id: string;
  title?: string;
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
): string {
  const appCurrency = parseAppCurrency(currency);
  const migrated = migrateScreen(screen, { variantOnly: true, includeSavedRing: true });
  deviceData = withRecordScreen(captureDeviceTime(defs, deviceData), migrated);
  const snapshot = projectDeviceData(deviceData, redactPrivateMarks(values).values);
  const local = localValues(screen.id, values);
  const { values: safe, addresses } = redactPrivateMarks(local);
  const header = `screen ${screen.id}${screen.title ? ` ${quote(screen.title)}` : ""}`;
  const lines = migrated.components.flatMap(({ id, c, state, ...props }) => {
    const def = defs[c];
    if (!def) return [`${id} ${c} (unknown)`];
    const selection = selectionBindingFor(migrated, defs, def.meta, id, safe, snapshot, addresses)?.view;
    const target = driveTarget(def.meta, migrated, defs, safe, snapshot, canDrive, addresses);
    return readComponent(
      def,
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
    );
  });
  return [header, ...lines].join("\n");
}
