import type { ReactNode } from "react";
import { Row } from "./KitRow";
import type { SurfaceTone } from "./style";

/**
 * One static block of a card: the same insets, gap and edge alignment as a `KitRow`, but not an item of
 * a list (no item id, no list role). Use it for single-statement components such as Note and Header.
 */
export function KitBlock(props: {
  label: string;
  children: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  goto?: string | undefined;
  lineRole?: "body" | "heading" | "title" | "display";
  /** Draws the block as a tinted panel in this tone (a banner). Without it the block has no surface. */
  tone?: SurfaceTone;
}) {
  return <Row {...props} role="text" />;
}
