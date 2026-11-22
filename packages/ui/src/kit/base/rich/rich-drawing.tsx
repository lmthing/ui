import { YStack } from "tamagui";
import { emptyLine, space } from "../../../catalog";
import { useEmptyThing } from "../../part";
import { useWords } from "../../provider";
import { KitIcon, KitText } from "../text";

export type Drawing = { part?: string; loading?: boolean };
export type Target = { item?: string; part: string };
export const safeRatio = (ratio: number) =>
  Number.isFinite(ratio) && ratio > 0 && Number.isFinite(1 / ratio) ? ratio : 1;

export function RichEmpty() {
  const { lang } = useWords();
  const thing = useEmptyThing();
  return (
    <YStack alignItems="center" gap={space.md} padding={space.xl}>
      <KitIcon name="sparkles" tone="muted" scale="lg" decorative />
      <KitText tone="muted" align="center" part={null}>
        {emptyLine(thing, lang)}
      </KitText>
    </YStack>
  );
}
