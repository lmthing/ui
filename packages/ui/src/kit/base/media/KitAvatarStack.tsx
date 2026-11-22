import type { ReactNode } from "react";
import { XStack, YStack } from "tamagui";
import { component, radius, space, type AxisValue } from "../../../catalog";
import { PartContext, usePart, usePartContext } from "../../part";
import { KitPhoto } from "./KitPhoto";

type Member = { id: string; label: string; photo?: string | undefined; mark?: AxisValue<"mark"> };

function Avatar({ label, photo, mark, loading }: Omit<Member, "id"> & { loading: boolean }) {
  const address = usePart("root", !loading);
  const initials = label
    .trim()
    .split(/\s+/u, 2)
    .map((word) => Array.from(word)[0] ?? "")
    .join("");
  return (
    <YStack
      {...(!loading ? address : {})}
      marginLeft={-space.md}
      borderRadius={radius.pill}
      borderWidth={component.base.strongBorder}
      borderColor="$surface"
      accessibilityRole={loading ? undefined : "image"}
      accessibilityLabel={loading ? undefined : label}
      opacity={!loading && mark === "muted" ? component.base.disabledOpacity : undefined}
    >
      <KitPhoto
        {...{ photo, label, initials, loading }}
        shape="round"
        part={loading ? null : "photo"}
        ring={!loading && mark === "highlight" ? "accent" : "none"}
      />
      {!loading && mark === "new" && (
        <YStack
          position="absolute"
          right={space.xs}
          bottom={space.xs}
          width={space.md}
          height={space.md}
          borderRadius={radius.pill}
          backgroundColor="$accent"
          borderWidth={component.base.strongBorder}
          borderColor="$surface"
          aria-hidden
          pointerEvents="none"
        />
      )}
    </YStack>
  );
}

/**
 * Overlapping round avatars, the first in front of the left edge, each one an item with its own
 * address. The people behind them beyond the shown ones are written beside it by the component.
 */
export function KitAvatarStack({
  members,
  children,
  loading = false,
}: {
  members: readonly Member[];
  /** Optional count or label, inline after the overlapping avatars. */
  children?: ReactNode;
  loading?: boolean;
}) {
  const context = usePartContext();
  return (
    <XStack paddingLeft={space.md} alignItems="center" aria-hidden={loading || undefined}>
      {members.map((member) => (
        <PartContext.Provider key={member.id} value={{ ...context, item: member.id }}>
          <Avatar {...member} loading={loading} />
        </PartContext.Provider>
      ))}
      {!loading && children && <XStack marginLeft={space.sm}>{children}</XStack>}
    </XStack>
  );
}
