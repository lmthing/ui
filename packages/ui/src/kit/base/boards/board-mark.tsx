import type { IconName } from "../../../catalog";
import { KitIcon } from "../text";

export type BoardMark = { icon: IconName; label: string };

export function BoardGlyph({ mark }: { mark: BoardMark }) {
  return <KitIcon name={mark.icon} scale="sm" decorative />;
}
