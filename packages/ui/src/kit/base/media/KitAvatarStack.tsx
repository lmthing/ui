import { XStack, YStack } from "tamagui";
import { component, radius, size, space } from "../../../catalog";
import { PartContext, usePart, usePartContext } from "../../part";
import { KitIcon } from "../text";
import { KitPhoto } from "./KitPhoto";

function Avatar({ label, photo }: { label: string; photo?: string | undefined }) {
  const address = usePart();
  const placeholder = usePart("photo");
  return (
    <YStack
      {...address}
      marginLeft={-space.sm}
      borderRadius={radius.pill}
      borderWidth={component.base.strongBorder}
      borderColor="$surface"
      accessibilityRole="image"
      accessibilityLabel={label}
    >
      {photo ? (
        <KitPhoto photo={photo} shape="round" part="photo" label={label} />
      ) : (
        <YStack
          {...placeholder}
          width={size.avatar.md}
          height={size.avatar.md}
          borderRadius={radius.pill}
          backgroundColor="$raised"
          alignItems="center"
          justifyContent="center"
        >
          <KitIcon name="user" decorative />
        </YStack>
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
}: {
  members: readonly { id: string; label: string; photo?: string | undefined }[];
}) {
  const context = usePartContext();
  return (
    <XStack paddingLeft={space.sm} alignItems="center">
      {members.map((member) => (
        <PartContext.Provider key={member.id} value={{ ...context, item: member.id }}>
          <Avatar label={member.label} photo={member.photo} />
        </PartContext.Provider>
      ))}
    </XStack>
  );
}
