import { Image, YStack, styled } from "tamagui";
import { radius, size } from "../../catalog";
import { useKit } from "../provider";
import { usePart } from "../part";

const Frame = styled(YStack, {
  width: size.avatar.md, height: size.avatar.md, borderRadius: radius.sm,
  overflow: "hidden", backgroundColor: "$accentSoft",
});
export function KitPhoto({ photo, part = "icon" }: { photo: string; part?: string }) {
  const source = useKit().resolvePhoto?.(photo);
  return <Frame {...usePart(part)} accessibilityRole="image" accessibilityLabel={photo}>
    {source && <Image source={{ uri: source }} width={size.avatar.md} height={size.avatar.md} />}
  </Frame>;
}
