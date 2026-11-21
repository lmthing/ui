import { Children, createContext, isValidElement, type ReactNode } from "react";
import { YStack } from "tamagui";
import { component, space, type ThemeDensity } from "../../../catalog";
import { useVariantDensity } from "../../provider";

export const RowGroupLead = createContext<"avatar" | undefined>(undefined);

/** Sibling rows share an optional leading rail and separators. */
export function KitRowGroup({
  children,
  density,
  leadingWidth,
  separators = true,
  spacing = "rows",
}: {
  children: ReactNode;
  density?: ThemeDensity | undefined;
  leadingWidth?: "avatar" | undefined;
  separators?: boolean;
  spacing?: "rows" | "groups";
}) {
  const rows = Children.toArray(children);
  const rhythm = useVariantDensity(density);
  if (!rows.length) return null;
  return (
    <RowGroupLead.Provider value={leadingWidth}>
      <YStack accessibilityRole="list" gap={spacing === "groups" ? space[rhythm.gap] : undefined}>
        {rows.map((row, index) => (
          <YStack key={isValidElement(row) ? (row.key ?? index) : index} accessibilityRole="listitem">
            {separators && index !== 0 && (
              <YStack height={component.base.borderWidth} backgroundColor="$line" aria-hidden />
            )}
            {row}
          </YStack>
        ))}
      </YStack>
    </RowGroupLead.Provider>
  );
}
