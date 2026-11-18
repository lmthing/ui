import type { ReactNode } from "react";
import { XStack, YStack } from "tamagui";
import { size, space } from "../../../catalog";
import { PartContext, usePart, usePartContext } from "../../part";
import { useKitStyle } from "../../provider";
import { KitText, shifted } from "../text";

type SetRowProps = {
  part?: string;
  loading?: boolean;
  item: string;
  label: string;
  fields: readonly { id: string; label: string; control: ReactNode }[];
  done: ReactNode;
  detail?: ReactNode;
};

function LoadingSlot({ loading, children }: { loading: boolean; children: ReactNode }) {
  const ks = useKitStyle();
  return (
    <YStack backgroundColor={loading ? "$line" : undefined} borderRadius={shifted("sm", ks.radiusShift)}>
      <YStack
        {...(loading ? { visibility: "hidden" as const, pointerEvents: "none" as const, inert: true } : {})}
        aria-hidden={loading || undefined}
        accessibilityElementsHidden={loading}
      >
        {children}
      </YStack>
    </YStack>
  );
}

function SetContent({
  part = "root",
  loading = false,
  label,
  fields,
  done,
  detail,
}: Omit<SetRowProps, "item">) {
  const address = usePart(part);
  const ks = useKitStyle();
  return (
    <YStack
      {...address}
      gap={space.sm}
      paddingVertical={space[ks.density.rowPad]}
      aria-busy={loading || undefined}
    >
      <LoadingSlot loading={loading}>
        <KitText role="label" part={loading ? null : "label"}>
          {label}
        </KitText>
      </LoadingSlot>
      <XStack gap={space.sm} alignItems="flex-end" flexWrap="wrap">
        {fields.map((field) => (
          <YStack key={field.id} flex={1} minWidth={size.control.md} gap={space.xs}>
            <LoadingSlot loading={loading}>
              <KitText role="caption" tone="muted" part={loading ? null : `${field.id}_label`}>
                {field.label}
              </KitText>
            </LoadingSlot>
            <YStack
              minHeight={size.control.md}
              borderRadius={shifted("md", ks.radiusShift)}
              backgroundColor={loading ? "$line" : undefined}
            >
              <LoadingSlot loading={loading}>{field.control}</LoadingSlot>
            </YStack>
          </YStack>
        ))}
        <YStack
          minWidth={size.control.md}
          minHeight={size.control.md}
          backgroundColor={loading ? "$line" : undefined}
          borderRadius={shifted("sm", ks.radiusShift)}
        >
          <LoadingSlot loading={loading}>{done}</LoadingSlot>
        </YStack>
      </XStack>
      {detail && <LoadingSlot loading={loading}>{detail}</LoadingSlot>}
    </YStack>
  );
}

/** A caller-owned set's labelled controls, completion control and optional detail. */
export function KitSetRow({ item, ...props }: SetRowProps) {
  const context = usePartContext();
  return (
    <PartContext.Provider
      value={{ ...context, item, ...(props.loading ? { state: "loading" as const } : {}) }}
    >
      <SetContent {...props} />
    </PartContext.Provider>
  );
}
