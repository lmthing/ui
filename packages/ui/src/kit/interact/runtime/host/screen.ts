import {
  atDeviceTime,
  filterDeviceDataScreen,
  hostActionPolicy,
  hostSubjects,
  isDeviceDataVisible,
  liveProps,
  parseControlProps,
  projectDeviceData,
  projectSelectionBinding,
  selectionBindingFor,
  withDisabledSelectionChecks,
  withRecordScreen,
  type HostActionPolicy,
  type ScreenLike,
  type Values,
} from "../../../../catalog";
import { projectScreen } from "../../index";
import type { ControllerContext, ControllerOptions } from "../index";
import { createHostCommands } from "./commands";
import { allowsDestination, type ParentGateProof } from "./parent-gate";

export function bindParentGatePart(ctx: ControllerContext, address: string, destination: string) {
  const local = ctx.relative(address);
  const token = ctx.mounted.get(local);
  const gate = ctx.options.parentGate;
  if (!token || !gate || ctx.standalone) return;
  return (proof: ParentGateProof) => {
    if (
      ctx.status.disposed ||
      ctx.options.interactive === false ||
      ctx.options.parentGate !== gate ||
      !ctx.admitted() ||
      ctx.mounted.get(local) !== token ||
      ctx.disabledParts.has(local) ||
      ctx.confirmationFor()
    )
      return false;
    const sheet = ctx.status.openSheet;
    const snapshot = ctx.liveScreen(ctx.valuesOf(), sheet, Boolean(sheet));
    if (!snapshot.components.some(({ id }) => id === local.split("/")[0])) return false;
    try {
      return gate.submit({ address: `${ctx.screen.id}/${local}`, destination, proof }) === true;
    } catch {
      return false;
    }
  };
}

export function hostSubjectsOnScreen(
  options: ControllerOptions,
  screen: ScreenLike,
  component: string,
  values: Values,
  now: number,
) {
  if (!allowsDestination(options.parentGate, screen.id)) return [];
  const entry = screen.components.find(({ id }) => id === component);
  const def = entry && options.defs[entry.c];
  if (!def?.meta.hostCommands || !entry || values[`${screen.id}/${component}/$dismissed`]) return [];
  const data = withRecordScreen(atDeviceTime(projectDeviceData(options.deviceData, values), now), screen);
  if (!isDeviceDataVisible(def.meta, data)) return [];
  const prefix = `${screen.id}/`;
  const local = Object.fromEntries(
    Object.entries(values).map(([key, value]) => [
      key.startsWith(prefix) ? key.slice(prefix.length) : key,
      value,
    ]),
  );
  const { id: _id, c: _c, state: _state, ...input } = entry;
  const props = parseControlProps(def, input, (part) => local[`${component}/${part}`]);
  const live = liveProps(def.meta, props, component, local, true, data);
  const selection = selectionBindingFor(screen, options.defs, def.meta, component, local, data);
  return hostSubjects(def.meta, component, projectSelectionBinding(def.meta, live, selection?.view));
}

function withHostPolicy(
  screen: ScreenLike,
  options: ControllerOptions,
  policy: HostActionPolicy,
  enabled: boolean,
): ScreenLike {
  if (!enabled) return screen;
  return {
    ...screen,
    [hostActionPolicy]: {
      ...policy,
      scannerBrightnessAvailable: options.interactive !== false && !!options.hostCommands?.scannerBrightness,
      ...(options.interactive === false ? { allowsCommand: () => false } : {}),
      ...(options.parentGate
        ? { allowsLink: (goto) => goto === "sheet" || allowsDestination(options.parentGate, goto) }
        : {}),
    },
  };
}

export function createHostProjection(
  options: ControllerOptions,
  screen: ScreenLike,
  standalone: boolean,
  now: () => number,
  valuesOf: (at?: number) => Values,
  disabled: Pick<ReadonlySet<string>, "has" | "size">,
  changed: () => void,
) {
  const enabled =
    !standalone &&
    Boolean(
      options.parentGate ||
      screen.components.some(({ c }) => {
        const meta = options.defs[c]?.meta;
        return meta?.hostCommands || meta?.actions?.scannerBrightness;
      }),
    );
  const subjects = (id: string): ReturnType<typeof hostSubjectsOnScreen> => {
    const at = now();
    const values = valuesOf(at);
    return hostSubjectsOnScreen(options, withPolicy(values), id, values, at);
  };
  const hosts = createHostCommands(screen.id, () => options.hostCommands, subjects, changed);
  const withPolicy = (values: Values): ScreenLike =>
    withDisabledSelectionChecks(
      withHostPolicy(
        screen,
        options,
        { ...hosts.policy(values), isDisabled: (address) => disabled.has(address) },
        enabled,
      ),
      disabled,
    );
  return {
    hosts,
    subjects,
    withPolicy,
    admitted: () => allowsDestination(options.parentGate, screen.id),
    liveScreen: projectLive(options, screen, standalone, now, withPolicy),
  };
}

function hostHidesSheet(screen: ScreenLike, visible: ScreenLike, sheet: string | undefined) {
  return (
    visible !== screen &&
    screen.components.some(({ id }) => id === sheet) &&
    !visible.components.some(({ id }) => id === sheet)
  );
}

export function projectLive(
  options: ControllerOptions,
  screen: ScreenLike,
  standalone: boolean,
  now: () => number,
  withPolicy: (values: Values) => ScreenLike,
) {
  return (values: Values, sheet: string | undefined, covered = false, at = now()) => {
    if (!allowsDestination(options.parentGate, screen.id)) return { id: screen.id, components: [] };
    const source = withPolicy(values);
    const visible = filterDeviceDataScreen(
      source,
      options.defs,
      projectDeviceData(options.deviceData, values),
    );
    if (standalone) return visible;
    const projected = projectScreen(
      visible,
      options.defs,
      values,
      at,
      sheet,
      false,
      false,
      options.deviceData,
    );
    return covered && !hostHidesSheet(source, visible, sheet)
      ? { ...projected, components: projected.components.filter((entry) => entry.id === sheet) }
      : projected;
  };
}
