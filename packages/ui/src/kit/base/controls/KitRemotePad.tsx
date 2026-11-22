import { useEffect } from "react";
import { ChevronDown, ChevronUp, VolumeX } from "@tamagui/lucide-icons";
import { XStack, YStack, isWeb } from "tamagui";
import { component, radius, size, space, type IconName } from "../../../catalog";
import { PartContext, usePart, usePartContext } from "../../part";
import { useKit, useWords } from "../../provider";
import { KitIcon, KitText } from "../text";
import { remoteLabels } from "./remote-copy";
import { buttonEvents } from "./use-continuous-press";

type RemoteProps = {
  part?: string;
  loading?: boolean;
  label: string;
  hasMic?: boolean;
  target: { item?: string; part: string };
  disabled?: boolean;
};
type Key = keyof typeof remoteLabels | "play";
type KeyProps = { name: Key; part: string; loading: boolean; disabled: boolean };
const icons: Partial<Record<Key, IconName>> = {
  left: "chevron_left",
  right: "chevron_right",
  back: "arrow_left",
  home: "home",
  voice: "mic",
  volume_up: "plus",
  volume_down: "minus",
};
const otherIcons = { up: ChevronUp, down: ChevronDown, mute: VolumeX } as const;
const commands = { volume_up: "increment", volume_down: "decrement", mute: "toggle" } as const;
const directionRows = [["up"], ["left", "ok", "right"], ["down"]] as const;
const mediaRows = [
  ["back", "play", "home"],
  ["volume_down", "mute", "volume_up"],
] as const;
const ringSize = size.control.md * 3 + space.xs * 4;

function KeyIcon({
  name,
  label,
  playing,
  disabled,
}: {
  name: Key;
  label: string;
  playing: boolean;
  disabled: boolean;
}) {
  const icon = name === "play" ? (playing ? "pause" : "play") : icons[name];
  if (icon) return <KitIcon name={icon} decorative tone={disabled ? "muted" : "text"} />;
  if (name === "ok")
    return (
      <KitText part={null} role="label" tone={disabled ? "muted" : "text"}>
        {label}
      </KitText>
    );
  const Glyph = otherIcons[name as keyof typeof otherIcons];
  return <Glyph size={size.icon.md} color={disabled ? "$muted" : "$text"} aria-hidden />;
}

function RemoteKey({ name, part, loading, disabled }: KeyProps) {
  const { controller, interactive } = useKit();
  const { component: id } = usePartContext();
  const { mediaLabels } = useWords().words;
  const address = usePart(part, !loading);
  const offered =
    interactive && controller ? controller.actionsAt(address.testID, { ignoreDisabledPart: true }) : [];
  const playing =
    name === "play" &&
    (offered.includes("play") === offered.includes("pause")
      ? Boolean(
          controller?.snapshotScreen().components.find(({ id: componentId }) => componentId === id)?.playing,
        )
      : offered.includes("pause"));
  const action =
    name === "play"
      ? playing
        ? "pause"
        : "play"
      : name in commands
        ? commands[name as keyof typeof commands]
        : "press";
  const label = name === "play" ? mediaLabels[action === "pause" ? "pause" : "play"] : remoteLabels[name];
  const blocked = disabled || Boolean(interactive && controller && !offered.includes(action));
  const enabled = Boolean(interactive && controller && !blocked && !loading);
  useEffect(
    () => (disabled || loading ? controller?.registerDisabledPart(address.testID) : undefined),
    [controller, address.testID, disabled, loading],
  );
  const press = () => controller?.act({ address: address.testID, action });
  return (
    <YStack
      {...(loading
        ? { "aria-hidden": true }
        : { ...address, accessibilityRole: "button", accessibilityLabel: label })}
      aria-disabled={blocked || undefined}
      {...(!isWeb ? { accessible: !loading, accessibilityState: { disabled: blocked } } : {})}
      {...(enabled ? { ...buttonEvents(press), cursor: "pointer" } : {})}
      focusable={enabled}
      width={size.control.md}
      height={size.control.md}
      alignItems="center"
      justifyContent="center"
      borderRadius={radius.pill}
      backgroundColor={loading ? "$line" : blocked ? "$surface" : name === "ok" ? "$accentSoft" : "$raised"}
      pressStyle={enabled ? { backgroundColor: "$accentSoft" } : null}
    >
      {!loading && <KeyIcon {...{ name, label, playing, disabled: blocked }} />}
    </YStack>
  );
}

function RemoteKeys({
  center,
  loading,
  disabled,
  hasMic,
}: {
  center: string;
  loading: boolean;
  disabled: boolean;
  hasMic: boolean;
}) {
  // If the caller renames the center to a reserved key name, the explicit target wins.
  const row = (keys: readonly Key[]) => (
    <XStack key={keys[0]} justifyContent="center" gap={space.xs}>
      {keys.map((name) =>
        name !== "ok" && center === name ? (
          <YStack key={name} width={size.control.md} height={size.control.md} />
        ) : (
          <RemoteKey key={name} name={name} part={name === "ok" ? center : name} {...{ loading, disabled }} />
        ),
      )}
    </XStack>
  );
  return (
    <>
      <YStack
        width={ringSize}
        height={ringSize}
        gap={space.xs}
        justifyContent="center"
        borderRadius={radius.pill}
        borderWidth={component.base.borderWidth}
        borderColor="$line"
        backgroundColor="$surface"
      >
        {directionRows.map(row)}
      </YStack>
      <YStack gap={space.xs} alignItems="center">
        {mediaRows.map(row)}
        {hasMic && row(["voice"])}
      </YStack>
    </>
  );
}

/** The center is caller-addressed. All other keys use their conventional sibling parts. */
export function KitRemotePad({
  part = "root",
  loading = false,
  label,
  target,
  hasMic = false,
  disabled = false,
}: RemoteProps) {
  const context = usePartContext();
  const targetContext = target.item === undefined ? context : { ...context, item: target.item };
  const occupied =
    targetContext.item === context.item &&
    (target.part === part ||
      part === "play" ||
      (part !== "ok" && (part === "voice" ? hasMic : Object.hasOwn(remoteLabels, part))));
  const addressed = loading || !occupied;
  const address = usePart(part, addressed);
  return (
    <YStack
      {...(addressed ? address : {})}
      alignItems="center"
      gap={space.md}
      {...(loading ? {} : { role: "group" as const, "aria-label": label })}
      aria-busy={loading || undefined}
    >
      <PartContext.Provider value={targetContext}>
        <RemoteKeys center={target.part} {...{ loading, disabled, hasMic }} />
      </PartContext.Provider>
    </YStack>
  );
}
