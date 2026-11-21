import type { components } from "@lmthing/ui/catalog";
import type { input as Input, ZodType } from "zod";

export type Definitions = typeof components;
export type Line = { id: string; c: string } & Record<string, unknown>;
export type Source = { defs: Definitions; lines: Line[] };

export function findLine({ lines }: Source, component: string, id?: string): Line {
  const line = lines.find((row) => row.c === component && (id === undefined || row.id === id));
  if (!line) throw new Error(`Missing worked record source: ${component}${id ? `/${id}` : ""}`);
  return line;
}

export function read<S extends ZodType>(
  source: Source,
  def: { meta: { id: string }; props: S },
  id?: string,
): Input<S> {
  const { c: _c, id: _id, ...props } = findLine(source, def.meta.id, id);
  def.props.parse(props);
  // Use the validated wire fields, not the synthetic fields some schemas add for rendering.
  return props as Input<S>;
}
