import type { Definition } from "../../probes";
import { nestedAt, parseControlProps, type ScreenLike } from "../index";

export function nestedSpec(screen: ScreenLike, defs: Record<string, Definition>, address: string) {
  const [id, ...parts] = address.split("/");
  const entry = screen.components.find((item) => item.id === id);
  const def = entry && defs[entry.c];
  if (!def?.meta.items?.nested) return undefined;
  const { id: _id, c: _c, state: _state, ...raw } = entry!;
  const spec = nestedAt(def.meta, parseControlProps(def, raw), parts.join("/"))?.spec;
  if (!spec) return;
  return spec.action === "set" || spec.action === "toggle" ? spec : {};
}
