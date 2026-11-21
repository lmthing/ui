import type { ReactNode } from "react";
import { YStack, isWeb } from "tamagui";
import { space, type IconName, type ThemeDensity } from "../../../catalog";
import { useComponentState } from "../../part";
import { useVariantDensity, useWords } from "../../provider";
import { KitEmpty, KitSkeleton } from "../helpers";
import { KitLayoutText } from "./KitLayoutText";

type StateProps = {
  children?: ReactNode;
  /** Shared slots for a shaped loading state; omitted uses neutral row placeholders. */
  loading?: ReactNode;
  retain?: boolean;
  message?: string | undefined;
  part?: string | null;
  icon?: IconName | undefined;
  density?: ThemeDensity | undefined;
};

/** Default state treatment or inline feedback above retained content. */
export function KitState({ children, loading, retain, message, part = null, icon, density }: StateProps) {
  const state = useComponentState();
  const { words } = useWords();
  const gap = space[useVariantDensity(density).contentGap];
  if (state === "loading") {
    return (
      <YStack
        gap={gap}
        aria-busy
        aria-hidden
        accessibilityElementsHidden
        pointerEvents="none"
        {...(isWeb ? { inert: true } : {})}
      >
        {loading ?? <KitSkeleton density={density} />}
      </YStack>
    );
  }
  if (state === "empty")
    return (
      <KitEmpty
        {...{ part, density }}
        {...(icon ? { icon } : {})}
        {...(message ? { title: message } : {})}
        prominence="body"
        decorativeIcon
      />
    );
  const resolved = state === "success" || state === "error";
  const failed = state === "error";
  const text = message ?? (failed ? words.operationFailed : words.saved);
  const tone = failed ? "bad" : "good";
  if (retain || !resolved)
    return (
      <YStack gap={gap}>
        {resolved && (
          <YStack accessibilityRole={failed ? "alert" : "status"}>
            <KitLayoutText line={{ text, part, role: "meta", tone }} density={density} />
          </YStack>
        )}
        {children}
      </YStack>
    );
  return (
    <KitEmpty
      title={text}
      {...{ part, density, tone }}
      icon={icon ?? (failed ? "alert" : "check")}
      announce={failed ? "alert" : "status"}
      prominence="body"
      decorativeIcon
    />
  );
}
