import {
  atDeviceTime,
  buzzTarget,
  hostActionPolicy,
  isDeviceDataVisible,
  isKeypadPart,
  isLocalAnchorAction,
  migrateScreen,
  parseAddress,
  planAct,
  projectDeviceData,
  readScreen,
  withDisabledSelectionChecks,
  type AppCurrency,
  type CanDrive,
  type Definition,
  type DeviceData,
  type ScreenLike,
  type Values,
} from "../../../catalog";
import type { Confirmation, ControllerContext } from "./context";
import type { PrivateMarks } from "../../../catalog/agent/private-controls";
import { commandForConfirmation } from "./host";
import { matchesMediaConfirmation } from "./media";
import { matchesItemConfirmation } from "./item-confirmation";

export function isKeypad(ctx: ControllerContext, full: string) {
  const address = parseAddress(full);
  const entry = address?.component && ctx.sourceOf(address.component);
  return isKeypadPart(entry ? ctx.defs[entry.c]?.props : undefined, address?.part ?? "root");
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
  if (confirmation.host && !commandForConfirmation(confirmation)) return;
  const policy = screen[hostActionPolicy];
  if (confirmation.goto && policy?.allowsLink?.(confirmation.goto) === false) return;
  const source = confirmation.source.startsWith(`${screen.id}/`)
    ? confirmation.source.slice(screen.id.length + 1)
    : confirmation.source;
  const entry = screen.components.find(({ id }) => id === source.split("/")[0]);
  const def = entry && defs[entry.c];
  if (
    confirmation.itemIdentity !== undefined &&
    (!entry || !def || !matchesItemConfirmation(def, entry, source, confirmation.itemIdentity))
  )
    return;
  const meta = def?.meta;
  if (!meta) return confirmation.mediaBound ? undefined : confirmation;
  const values = valuesOf(at);
  if (!isDeviceDataVisible(meta, projectDeviceData(data, values))) return;
  const bound = meta.selectionBinding || meta.drives;
  if (
    entry &&
    (bound ||
      confirmation.itemIdentity !== undefined ||
      meta.deviceDataFlags ||
      meta.media ||
      meta.items?.media ||
      meta.sequence ||
      meta.draw?.kind === "deck") &&
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
  /"(?:\\.|[^"\\])*"| \[([\w/-]+) (?:(type|set|increment|decrement|focus|jump|press)(?: = (?:"(?:\\.|[^"\\])*"|-?\d+(?:\.\d+)?(?:e[+-]?\d+)?))?(?:; (?:min|max|step) [-+\de.]+(?:, (?:min|max|step) [-+\de.]+)*)?(?:; range [01]\.\.\d+)?(?:; chars "(?:\\.|[^"\\])*"; length \d+)?|(?:press|scan):(?:(?:pick|scan|preview|export)(?::(?:pending|ready|error))?|next|previous)|(?:play|pause|stop):(?:playing|paused|stopped|error)|seek(?::\d+| = \d+; range [01]\.\.\d+))(?: !needs-[a-z]+)?\]/g;

function isBuzzOffer(screen: ScreenLike, defs: Record<string, Definition>, address: string) {
  const [id, ...parts] = address.split("/");
  const entry = screen.components.find((component) => component.id === id);
  const meta = entry && defs[entry.c]?.meta;
  return !!meta && Boolean(buzzTarget(meta, parts.join("/"), "press"));
}

function readPolicy(screen: ScreenLike, disabled?: ReadonlyMap<string, unknown>) {
  const source = withDisabledSelectionChecks(screen, disabled);
  if (!disabled?.size) return source;
  const host = source[hostActionPolicy];
  return {
    ...source,
    [hostActionPolicy]: {
      ...host,
      isDisabled: (address: string) => disabled.has(address) || !!host?.isDisabled?.(address),
    },
  };
}

export function readControls(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  values: Values,
  lang?: string,
  disabled?: ReadonlyMap<string, unknown>,
  deviceData?: DeviceData,
  currency?: AppCurrency,
  canDrive?: CanDrive,
  privateMarks?: PrivateMarks,
): string {
  const source = readPolicy(screen, disabled);
  const migrated = migrateScreen(source, { variantOnly: true });
  const read = readScreen(source, defs, values, lang, deviceData, currency, canDrive, withKeypadDrafts);
  return disabled?.size || privateMarks?.size || canDrive
    ? read.replace(controlTokens, (token, address, action) => {
        if (action === "set" && privateMarks?.has(address)) return "";
        if (disabled?.has(address) && (action !== "press" || isBuzzOffer(migrated, defs, address))) return "";
        if (isLocalAnchorAction(action) && canDrive?.(address, undefined, action) === false) return "";
        return token;
      })
    : read;
}

function hasKeypads(def?: Definition) {
  const schema = def?.props.meta();
  return Array.isArray(schema?.keypadParts) || Boolean(schema?.keypadProfiles);
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
  if (!read || !hasKeypads(def)) return def;
  const actions = def.meta.actions;
  const own = Object.keys(actions?.parts ?? {}).filter(
    (part) => isKeypadPart(def.props, part) && !Object.hasOwn(actions?.privateInput ?? {}, part),
  );
  const itemParts = Object.keys(actions?.items ?? {}).filter((part) => isKeypadPart(def.props, part));
  return {
    ...def,
    meta: {
      ...def.meta,
      read: (input, state, lang, deviceData, currency, get) => {
        const projected = projectValue(input as Values, address, own, values);
        const items = def.meta.items?.key;
        const rows = items && projected[items];
        if (!items || !Array.isArray(rows) || !itemParts.length)
          return read(projected, state, lang, deviceData, currency, get);
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
          get,
        );
      },
    },
  };
}
