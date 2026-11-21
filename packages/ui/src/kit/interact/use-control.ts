import {
  createContext,
  useContext,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
  type RefObject,
} from "react";
import { isWeb } from "tamagui";
import {
  activeParentId,
  emptyDeviceData,
  linkedEditKey,
  liveProps,
  nestedControls,
  nestedRemaining,
  projectControls,
  projectLiveInputs,
  validateActionValue,
  type DeviceData,
  type Meta,
  type Values,
} from "../../catalog";
import { usePartContext } from "../part";
import { useKit } from "../provider";
const subscribeNone = () => () => {};
export const DeviceDataContext = createContext<DeviceData | undefined>(undefined);

/** Host currency, if configured on the same controller that reads this screen. */
export function useAppCurrency() {
  return useKit().controller?.currency;
}

/** Live acknowledgements for this component and its currently identified rows. */
export function useHostOperations() {
  const { component } = usePartContext();
  const { controller } = useKit();
  const snapshot = controller?.hostOperationVersion ?? (() => 0);
  useSyncExternalStore(controller?.store.subscribe ?? subscribeNone, snapshot, snapshot);
  return controller?.hostOperations(component) ?? [];
}

/** Get the host's declared records for the current component, outside its parsed props. */
export function useDeviceData() {
  const { component } = usePartContext();
  const { controller } = useKit();
  const data = useContext(DeviceDataContext);
  return controller?.deviceDataFor(component, data) ?? emptyDeviceData;
}

/** Use the same store-backed presentation and derived gates as the reader and dispatcher. */
export function useLiveControls(meta: Meta, props: Values): Values {
  const { controller: host } = useKit();
  const { screen, component } = usePartContext();
  const controller = meta.linkedEdits || meta.selectionBinding ? host : undefined;
  const data = useContext(DeviceDataContext);
  const subscribe = controller?.store.subscribe ?? subscribeNone;
  useSyncExternalStore(
    subscribe,
    () => controller?.store.get(`${screen}/${component}/${linkedEditKey}`),
    () => controller?.store.get(`${screen}/${component}/${linkedEditKey}`),
  );
  // Recheck the controller's snapshot after commit, when PhoneScreen publishes refreshed host data.
  useSyncExternalStore(
    subscribe,
    () => controller?.deviceData,
    () => controller?.deviceData,
  );
  // Compare the resolved selection by value; its row array is rebuilt on each projection.
  const selectionSnapshot = () =>
    meta.selectionBinding
      ? JSON.stringify(controller?.liveControls(meta, props, component).$selection)
      : undefined;
  useSyncExternalStore(subscribe, selectionSnapshot, selectionSnapshot);
  return (
    host?.liveControls(meta, props, component) ??
    (meta.select?.runtime || meta.localState
      ? liveProps(meta, props, component, {}, true, data)
      : projectLiveInputs(meta, props, component, () => undefined, data))
  );
}
export function useControlValue<T>(address: string, fallback: T): T {
  const { controller } = useKit();
  return useSyncExternalStore(
    controller?.store.subscribe ?? subscribeNone,
    () => (controller?.store.get(address) as T) ?? fallback,
    () => fallback,
  );
}

/** Keep incomplete or invalid dates out of the shared interaction store. */
export function useDateEdit(address: string, committed: string | undefined, enabled: boolean) {
  const kit = useKit();
  const controller = enabled ? kit.controller : undefined;
  const [draft, setDraft] = useState<{ text: string; committed: typeof committed; address: string }>();
  // An external update takes precedence over a draft for the previous date.
  if (draft && (!controller || draft.committed !== committed || draft.address !== address))
    setDraft(undefined);
  if (!controller) return { value: committed };
  return {
    value: draft?.text ?? committed ?? "",
    onBlur: () => setDraft(undefined),
    onChangeText: (text: string) => {
      setDraft({ text, committed, address });
      if (!validateActionValue("set", text, { type: "date" }))
        controller.act({ address, action: "set", value: text });
    },
  };
}

/** PhoneScreen subscribes to the controller store; static renderers use their parsed props. */
export function useNestedControls(meta: Meta, props: Values) {
  const { controller } = useKit();
  const { screen, component } = usePartContext();
  const get = (part: string) => controller?.store.get(`${screen}/${component}/${part}`);
  const live = projectControls(meta, props, get);
  const controls = nestedControls(meta, live, get);
  const remaining = nestedRemaining(meta, live, controls);
  return {
    parent: activeParentId(meta, live, get),
    remaining,
    controls: controls
      .filter(({ enabled }) => enabled)
      .map((control) => ({
        ...control,
        disabled:
          (control.step !== undefined && control.step.next === undefined) ||
          (remaining !== undefined &&
            remaining < (control.togglePeers?.length ?? 0) &&
            control.item[control.spec.prop] !== true),
      })),
  };
}

/** Reparenting a card replaces its DOM nodes; restore focus only for a focused human control. */
export function useMoveFocus(pending: RefObject<string | null>, testID: string, ref: RefObject<unknown>) {
  const node = () => ref.current as HTMLElement | null;
  useLayoutEffect(() => {
    if (!isWeb || pending.current !== testID) return;
    pending.current = null;
    const card = node();
    (
      card?.querySelector<HTMLElement>('[role="link"]') ??
      card?.querySelector<HTMLElement>('[data-step-action="move"][tabindex="0"]') ??
      card
    )?.focus();
  });
  return (move: () => { ok: boolean }) => {
    if (isWeb && node()?.contains(document.activeElement)) pending.current = testID;
    if (!move().ok && pending.current === testID) pending.current = null;
  };
}
