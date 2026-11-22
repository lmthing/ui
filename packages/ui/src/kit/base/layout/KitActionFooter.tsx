import { Children, type ReactNode } from "react";
import { XStack } from "tamagui";
import { space, type ThemeDensity } from "../../../catalog";
import { useVariantDensity } from "../../provider";

/** Attach actions to their group without adding another horizontal gutter. */
export function KitActionFooter({
  children,
  density,
  align = "start",
  indent,
}: {
  children?: ReactNode;
  density?: ThemeDensity | undefined;
  align?: "start" | "end";
  indent?: 0 | 1 | undefined;
}) {
  const rhythm = useVariantDensity(density);
  if (!Children.toArray(children).length) return null;
  return (
    <XStack
      flexWrap="wrap"
      alignItems="center"
      justifyContent={align === "end" ? "flex-end" : "flex-start"}
      paddingLeft={indent === 1 ? space.xl : undefined}
      paddingTop={space[rhythm.contentGap]}
      gap={space[rhythm.contentGap]}
    >
      {children}
    </XStack>
  );
}
