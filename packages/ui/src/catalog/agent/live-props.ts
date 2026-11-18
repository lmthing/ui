import type { Meta } from "../meta";
import type { Values } from "./act";
import { projectSelection } from "./selection";
/** Runtime-only presentation keeps the validated wire data and stable item ids intact. */
export function liveProps(meta: Meta, props: Values, instance: string, values: Values): Values {
  props = projectSelection(meta, props, (part) => values[`${instance}/${part}`]);
  if (values[`${instance}/$runtime`]) {
    if (meta.id === "Counter" && Number(props.value) < Number(props.step ?? 1))
      props = { ...props, minus: undefined };
    if (meta.id === "Timer" && props.style !== "until") {
      const running = Boolean((values[`${instance}/$timer`] as { running?: boolean } | undefined)?.running);
      props = { ...props, start: running ? undefined : true, stop: running ? true : undefined };
    }
  }
  if (meta.id === "Field" || meta.id === "Search") {
    const value = values[`${instance}/field/$draft`] ?? values[`${instance}/field`];
    if (value !== undefined && props.kind !== "repeat" && props.kind !== "photo")
      props = { ...props, value: String(value) };
  }
  const key = meta.items?.key;
  if (!key || !Array.isArray(props[key])) return props;
  let items = props[key] as Values[];
  if (meta.items?.visible === "first") items = items.slice(Number(values[`${instance}/$cursor`] ?? 0));
  if (meta.id === "List" && props.style === "expand")
    items = items.map((item) =>
      values[`${instance}/${String(item.id)}`] === false ? { ...item, body: undefined } : item,
    );
  return { ...props, [key]: items };
}
