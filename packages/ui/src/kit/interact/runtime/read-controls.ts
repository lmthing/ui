import {
  atDeviceTime,
  captureDeviceTime,
  driveTarget,
  isDeviceDataVisible,
  migrateScreen,
  parseAddress,
  planAct,
  projectDeviceData,
  readComponent,
  readScreen,
  redactPrivateMarks,
  selectionBindingFor,
  withDisabledSelectionChecks,
  withRecordScreen,
  type AppCurrency,
  type CanDrive,
  type Definition,
  type DeviceData,
  type ScreenLike,
  type Values,
} from "../../../catalog";
import type { Confirmation, ControllerContext } from "./context";
import type { PrivateMarks } from "../../../catalog/agent/action-input";
import { matchesMediaConfirmation } from "./media";

export function isKeypad(ctx: ControllerContext, full: string) {
  const address = parseAddress(full);
  const entry = address?.component && ctx.sourceOf(address.component);
  const parts = entry ? ctx.defs[entry.c]?.props.meta()?.keypadParts : undefined;
  return Array.isArray(parts) && parts.includes(address?.part ?? "root");
}

export function visibleConfirmation(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  confirmation: Confirmation | undefined,
  data: DeviceData | undefined,
  at: number,
  valuesOf: (at: number) => Values,
): Confirmation | undefined {
  if (!confirmation) return;
  const source = confirmation.source.startsWith(`${screen.id}/`)
    ? confirmation.source.slice(screen.id.length + 1)
    : confirmation.source;
  const entry = screen.components.find(({ id }) => id === source.split("/")[0]);
  const meta = entry && defs[entry.c]?.meta;
  if (!meta) return confirmation.mediaBound ? undefined : confirmation;
  const values = valuesOf(at);
  if (!isDeviceDataVisible(meta, projectDeviceData(data, values))) return;
  const bound = meta.selectionBinding || meta.drives;
  if (
    entry &&
    (bound || meta.deviceDataFlags || meta.media || meta.items?.media || meta.sequence) &&
    confirmation.step
  ) {
    const sourceScreen = bound ? screen : { ...screen, components: [entry] };
    const plan = planAct(
      sourceScreen,
      defs,
      values,
      [confirmation.step],
      null,
      "controller",
      atDeviceTime(data, at),
      at,
    );
    if (!plan.ok || !matchesMediaConfirmation(confirmation, plan.media?.[0])) return;
  }
  return confirmation;
}

// Match quoted content as one token so a label cannot be mistaken for an affordance.
const controlTokens =
  /"(?:\\.|[^"\\])*"| \[([\w/-]+) (?:(type|set|increment|decrement)(?: = (?:"(?:\\.|[^"\\])*"|-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)(?:; range [01]\.\.\d+)?)?|(?:press|scan):(?:(?:pick|scan|preview|export)(?::(?:pending|ready|error))?|next|previous)|(?:play|pause|stop):(?:playing|paused|stopped|error)|seek(?::\d+| = \d+; range [01]\.\.\d+))(?: !needs-[a-z]+)?\]/g;

function projectValue(input: Values, address: string, parts: readonly string[], values: Values): Values {
  for (const part of parts) {
    const draft = values[part === "root" ? address : `${address}/${part}`];
    if (typeof draft === "string") return { ...input, value: draft };
  }
  return input;
}

/** Project exact keypad drafts only into `meta.read`, not into numeric wire props. */
function withKeypadDrafts(def: Definition, address: string, values: Values): Definition {
  const read = def.meta.read;
  const parts = def.props.meta()?.keypadParts;
  if (!read || !Array.isArray(parts)) return def;
  return {
    ...def,
    meta: {
      ...def.meta,
      read: (input, state, lang, deviceData, currency) => {
        const own = Object.keys(def.meta.actions?.parts ?? {}).filter((part) => parts.includes(part));
        const projected = projectValue(input as Values, address, own, values);
        const items = def.meta.items?.key;
        const rows = items && projected[items];
        if (!items || !Array.isArray(rows)) return read(projected, state, lang, deviceData, currency);
        const itemParts = Object.keys(def.meta.actions?.items ?? {}).filter((part) => parts.includes(part));
        return read(
          {
            ...projected,
            [items]: rows.map((row: Values) =>
              projectValue(row, `${address}/${String(row.id)}`, itemParts, values),
            ),
          },
          state,
          lang,
          deviceData,
          currency,
        );
      },
    },
  };
}

export function readControls(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  values: Values,
  lang?: string,
  disabled?: ReadonlyMap<string, symbol>,
  deviceData?: DeviceData,
  currency?: AppCurrency,
  canDrive?: CanDrive,
  privateMarks?: PrivateMarks,
): string {
  const source = withDisabledSelectionChecks(screen, disabled);
  const migrated = migrateScreen(source, { variantOnly: true });
  const hasKeypads = migrated.components.some(({ c }) => Array.isArray(defs[c]?.props.meta()?.keypadParts));
  const read = hasKeypads
    ? readKeypads(migrated, defs, values, lang, deviceData, currency, canDrive)
    : readScreen(source, defs, values, lang, deviceData, currency, canDrive);
  return disabled?.size || privateMarks?.size
    ? read.replace(controlTokens, (token, address, action) =>
        disabled?.has(address) || (action === "set" && privateMarks?.has(address)) ? "" : token,
      )
    : read;
}

function readKeypads(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  values: Values,
  lang?: string,
  deviceData?: DeviceData,
  currency?: AppCurrency,
  canDrive?: CanDrive,
) {
  deviceData = withRecordScreen(captureDeviceTime(defs, deviceData), screen);
  const snapshot = projectDeviceData(deviceData, redactPrivateMarks(values).values);
  const local = Object.fromEntries(
    Object.entries(values).map(([address, value]) => [address.replace(`${screen.id}/`, ""), value]),
  );
  const header = readScreen({ ...screen, components: [] }, defs, values, lang);
  const { values: safe, addresses } = redactPrivateMarks(local);
  return [
    header,
    ...screen.components.flatMap(({ id, c, state, ...props }) => {
      const def = defs[c];
      if (!def) return [`${id} ${c} (unknown)`];
      const selection = selectionBindingFor(screen, defs, def.meta, id, safe, snapshot, addresses);
      const target = driveTarget(def.meta, screen, defs, safe, snapshot, canDrive, addresses);
      return readComponent(
        withKeypadDrafts(def, id, safe),
        props,
        id,
        state,
        local,
        lang,
        deviceData,
        currency,
        selection?.view,
        target,
      );
    }),
  ].join("\n");
}
