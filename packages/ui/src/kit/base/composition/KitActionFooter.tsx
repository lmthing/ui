import { Children, type ReactNode } from "react";
import { XStack } from "tamagui";
import { space, type ThemeDensity } from "../../../catalog";
import { useVariantDensity } from "../../provider";

/** Attach one or more actions to their group without adding another horizontal gutter. */
export function KitActionFooter({
  children,
  density,
  align = "start",
}: {
  children?: ReactNode;
  density?: ThemeDensity | undefined;
  align?: "start" | "end";
}) {
  const rhythm = useVariantDensity(density);
  if (!Children.toArray(children).length) return null;
  return (
    <XStack
      flexWrap="wrap"
      alignItems="center"
      justifyContent={align === "end" ? "flex-end" : "flex-start"}
      paddingTop={space[rhythm.contentGap]}
      gap={space[rhythm.contentGap]}
    >
      {children}
    </XStack>
  );
}
