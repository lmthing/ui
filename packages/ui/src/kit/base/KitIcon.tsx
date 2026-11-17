import { Dot, Leaf, Droplet, Dog, Calendar, Clock, Check, ChevronRight } from "@tamagui/lucide-icons";
import { YStack, styled } from "tamagui";
import { size } from "../../catalog";
import { usePart } from "../part";

const Frame = styled(YStack, { alignItems: "center", justifyContent: "center" });
const views = { dot: Dot, leaf: Leaf, drop: Droplet, dog: Dog, calendar: Calendar,
  clock: Clock, check: Check, chevron_right: ChevronRight };
export function KitIcon({ name = "dot", part = "icon" }: { name?: string | undefined; part?: string }) {
  const Icon = views[name as keyof typeof views] ?? Dot;
  return <Frame {...usePart(part)} accessibilityElementsHidden aria-hidden>
    <Icon size={size.icon.md} color="$accent" />
  </Frame>;
}
