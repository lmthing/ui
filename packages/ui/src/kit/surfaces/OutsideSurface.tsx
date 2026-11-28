import { YStack } from "tamagui";
import { space, type ThemeChoice } from "../../catalog";
import { KitText } from "../base";
import { PartScope } from "../part";
import { KitProvider, type Environment, type NativeHost } from "../provider";
import { LockScreen } from "./LockScreen";
import { Message } from "./Message";
import { Widget } from "./Widget";
import {
  outsideSurfaceContent,
  surfaceIdentity,
  type OutsideSurfaceContent,
  type OutsideSurfaceKind,
  type SurfaceIdentity,
} from "./surface-content";
import { surfaceCopy, surfaceFallback } from "./surface-copy";

const views = { LockScreen, Widget, Message };

export type OutsideSurfaceProps = {
  kind: OutsideSurfaceKind;
  content: OutsideSurfaceContent;
  app: SurfaceIdentity;
  theme: ThemeChoice;
  environment?: Environment;
  nativeHost?: NativeHost;
  /** Increment for an explicit replay or preview change. Mounting alone does not animate. */
  cue?: number;
};

/** A still-by-default rule depiction, separate from screens, actions and the outside world. */
export function OutsideSurface({
  kind,
  content,
  app,
  theme,
  environment,
  nativeHost,
  cue,
}: OutsideSurfaceProps) {
  if (!Object.hasOwn(views, kind)) return null;
  const identity = surfaceIdentity.safeParse(app);
  if (!identity.success) return null;
  const parsed = outsideSurfaceContent.safeParse(content);
  const View = views[kind];
  const { label, note } = surfaceCopy[kind];
  return (
    <KitProvider theme={theme} {...(environment && { environment })} {...(nativeHost && { nativeHost })}>
      <PartScope screen="outside" component="preview" rev={1} state="filled">
        <YStack role="region" aria-label={label} gap={space.md} padding={space.lg}>
          <KitText role="label" part={null}>
            {label}
          </KitText>
          <View app={identity.data} content={parsed.success ? parsed.data : surfaceFallback} cue={cue} />
          <KitText role="body" tone="muted" part={null}>
            {note}
          </KitText>
        </YStack>
      </PartScope>
    </KitProvider>
  );
}
