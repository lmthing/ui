import type { AxisValue, ThemeDensity } from "../../../catalog";
import { KitContent } from "../text";
import { KitLayoutText, type LayoutLine } from "./KitLayoutText";

type MetaProps = {
  title: LayoutLine;
  meta?: LayoutLine | readonly LayoutLine[];
  align?: AxisValue<"align">;
  density?: ThemeDensity | undefined;
};

/** Title and supporting lines form one close group; unoccupied slots never draw a spacer. */
export function KitMetaLine({ title, meta, density, align = "start" }: MetaProps) {
  const lines = [title, ...(meta ? ("length" in meta ? meta : [meta]) : [])];
  if (!lines.some((line) => line.text)) return null;
  return (
    <KitContent density={density} align={align}>
      {lines.map((line, index) => (
        <KitLayoutText
          key={index}
          line={index === 0 ? line : { role: "meta", tone: "muted", ...line }}
          {...{ density, align }}
        />
      ))}
    </KitContent>
  );
}
