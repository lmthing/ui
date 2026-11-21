import {
  atDeviceTime,
  buzzTarget,
  captureDeviceTime,
  driveTarget,
  isDeviceDataVisible,
  migrateScreen,
  planAct,
  projectDeviceData,
  readComponent,
  readScreen,
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
import type { Confirmation } from "./context";

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
  if (!meta) return confirmation;
  const values = valuesOf(at);
  if (!isDeviceDataVisible(meta, projectDeviceData(data, values))) return;
  const bound = meta.selectionBinding || meta.drives;
  if (entry && (bound || meta.deviceDataFlags || meta.draw?.kind === "deck") && confirmation.step) {
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
    if (!plan.ok) return;
  }
  return confirmation;
}

// Match quoted content as one token so a label cannot be mistaken for an affordance.
const controlTokens =
  /"(?:\\.|[^"\\])*"| \[([\w/-]+) (type(?: = "(?:\\.|[^"\\])*")?|increment|decrement|press)(?: !needs-[a-z]+)?\]/g;

function isBuzzOffer(screen: ScreenLike, defs: Record<string, Definition>, address: string) {
  const [id, ...parts] = address.split("/");
  const entry = screen.components.find((component) => component.id === id);
  const meta = entry && defs[entry.c]?.meta;
  return !!meta && Boolean(buzzTarget(meta, parts.join("/"), "press"));
}

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
): string {
  const source = withDisabledSelectionChecks(screen, disabled);
  const migrated = migrateScreen(source, { variantOnly: true });
  const hasKeypads = migrated.components.some(({ c }) => Array.isArray(defs[c]?.props.meta()?.keypadParts));
  const read = hasKeypads
    ? readKeypads(migrated, defs, values, lang, deviceData, currency, canDrive)
    : readScreen(source, defs, values, lang, deviceData, currency, canDrive);
  return disabled?.size
    ? read.replace(controlTokens, (token, address, action) =>
        disabled.has(address) && (action !== "press" || isBuzzOffer(migrated, defs, address)) ? "" : token,
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
  const snapshot = projectDeviceData(deviceData, values);
  const local = Object.fromEntries(
    Object.entries(values).map(([address, value]) => [address.replace(`${screen.id}/`, ""), value]),
  );
  const header = readScreen({ ...screen, components: [] }, defs, values, lang);
  return [
    header,
    ...screen.components.flatMap(({ id, c, state, ...props }) => {
      const def = defs[c];
      if (!def) return [`${id} ${c} (unknown)`];
      const selection = selectionBindingFor(screen, defs, def.meta, id, local, snapshot);
      const target = driveTarget(def.meta, screen, defs, local, snapshot, canDrive);
      return readComponent(
        withKeypadDrafts(def, id, local),
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
