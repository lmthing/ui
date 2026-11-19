import { Children, type ReactNode } from "react";
import { XStack, YStack, isWeb } from "tamagui";
import { component, size, space } from "../../../catalog";
import { PartContext, usePart, usePartContext } from "../../part";
import { useKitStyle } from "../../provider";
import { KitText, shifted } from "../text";

type SetRowProps = {
  part?: string;
  loading?: boolean;
  item: string;
  label: string;
  /** Override the label address, or pass null to draw it without registering a part. */
  labelPart?: string | null;
  fields: readonly { id: string; label: string; control: ReactNode }[];
  done: ReactNode;
  detail?: ReactNode;
};

function LoadingSlot({
  loading,
  children,
  text = false,
}: {
  loading: boolean;
  children: ReactNode;
  text?: boolean;
}) {
  const ks = useKitStyle();
  return (
    <YStack
      position="relative"
      maxWidth="100%"
      alignSelf={text ? "flex-start" : undefined}
      borderRadius={shifted("sm", ks.radiusShift)}
    >
      <YStack
        {...(loading
          ? {
              opacity: component.base.none,
              pointerEvents: "none" as const,
              inert: true,
              ...(isWeb ? { style: { visibility: "hidden" } as never } : {}),
            }
          : {})}
        aria-hidden={loading || undefined}
        accessibilityElementsHidden={loading}
      >
        {children}
      </YStack>
      {loading && (
        <YStack
          position="absolute"
          top={text ? "50%" : component.base.none}
          marginTop={text ? -space.sm / 2 : component.base.none}
          left={component.base.none}
          width="100%"
          height={text ? space.sm : "100%"}
          backgroundColor="$line"
          borderRadius={shifted("sm", ks.radiusShift)}
          aria-hidden
        />
      )}
    </YStack>
  );
}

function SetFields({ loading = false, fields, done }: Pick<SetRowProps, "loading" | "fields" | "done">) {
  const ks = useKitStyle();
  const hasDone = Children.toArray(done).length > 0;
  if (!fields.length && !hasDone) return null;
  return (
    <XStack gap={space.sm} alignItems="flex-end" flexWrap="wrap">
      {fields.map((field) => (
        <YStack key={field.id} flex={1} minWidth={size.control.md} gap={space.xs}>
          <LoadingSlot loading={loading} text>
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
      {hasDone && (
        <YStack
          minWidth={size.control.md}
          minHeight={size.control.md}
          backgroundColor={loading ? "$line" : undefined}
          borderRadius={shifted("sm", ks.radiusShift)}
        >
          <LoadingSlot loading={loading}>{done}</LoadingSlot>
        </YStack>
      )}
    </XStack>
  );
}

function SetContent({
  part = "root",
  loading = false,
  label,
  labelPart = "label",
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
      <LoadingSlot loading={loading} text>
        <KitText role="label" part={loading ? null : labelPart}>
          {label}
        </KitText>
      </LoadingSlot>
      <SetFields {...{ loading, fields, done }} />
      {detail && (
        <LoadingSlot loading={loading} text>
          {detail}
        </LoadingSlot>
      )}
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
