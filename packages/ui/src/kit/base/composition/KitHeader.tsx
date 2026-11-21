import type { ComponentProps } from "react";
import { KitMetaLine } from "./KitMetaLine";

/** Section heading and optional supporting text, without an additional outer gutter. */
export function KitHeader(props: ComponentProps<typeof KitMetaLine>) {
  return <KitMetaLine {...props} title={{ role: "title", ...props.title }} />;
}
