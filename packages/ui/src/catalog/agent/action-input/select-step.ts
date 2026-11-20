import type { Definition } from "../../probes";
import type { DeviceData } from "../device-data";
import {
  liveProps,
  parseControlProps,
  projectAdjustments,
  selectionAt,
  selectionChanges,
  selectionError,
  selectionOffer,
  sessionActionProps,
  sessionState,
  type ActStep,
  type ScreenLike,
  type Values,
} from "../index";

export function localValues(screen: string, values: Values): Values {
  return Object.fromEntries(
    Object.entries(values).map(([address, value]) => [address.replace(`${screen}/`, ""), value]),
  );
}

export function selectStep(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  step: ActStep,
  address: string,
  values: Values,
  data?: DeviceData,
) {
  if (step.action !== "select") return { step };
  const [id, ...parts] = address.split("/");
  const entry = screen.components.find((item) => item.id === id);
  const def = entry && defs[entry.c];
  const target = parts.join("/") || "root";
  const offer = def && selectionOffer(def.meta, target);
  if (!def || (!def.meta.select && !offer)) return { step };
  const { id: _id, c: _c, state: _state, ...raw } = entry!;
  const local = localValues(screen.id, values);
  const get = (part: string) => local[`${id}/${part}`];
  let props = parseControlProps(def, raw, get);
  if (Object.hasOwn(def.meta.selections ?? {}, target))
    props = liveProps(def.meta, props, id!, local, true, data);
  else if (def.meta.items?.set) props = projectAdjustments(def.meta, props, get);
  props = sessionActionProps(def.meta, props, sessionState(def.meta, props, get));
  const error = selectionError(def.meta, props, target, step.value);
  return {
    step: { ...step, value: selectionAt(def.meta, props, target, step.value)?.value },
    error,
    declared: Boolean(offer && !offer.runtime),
    changes: Object.fromEntries(
      Object.entries(selectionChanges(def.meta, props, target, step.value)).map(([part, value]) => [
        `${screen.id}/${id}/${part}`,
        value,
      ]),
    ),
  };
}
