import type { ComponentProps, ReactNode } from "react";
import { formatAddress, numberLine, type Meta, type Props } from "../../../catalog";
import { KitAction, KitText, useWords } from "../../../kit";
import * as kit from "../../../kit";
import * as home from "..";
import { deviceRange, deviceValue, focusedDevice } from "../copy";
import { homeWordsFor } from "../lang";
// Core first: Field/slider stores a preference, not live device commands, readings or scenes.
export const meta = {
  id: "Devices",
  status: "draft",
  writeHints: home.deviceWriteHints,
  ...home.deviceControls,
  read: home.readDevices,
} as const satisfies Meta;
export const props = home.deviceProps;
export const fallback = home.deviceFallback;
export const examples = home.deviceExamples;
export const probes = home.deviceProbes;
type DevicePanel = Props<typeof props, typeof meta>;
type Device = Extract<DevicePanel["entries"][number], { entryKind: "device" }>;
type Tile = { row: Device; disabled: boolean; focused: boolean };

function DeviceText({ children, ...props }: ComponentProps<typeof KitText> & { children: string }) {
  const { role = "label", numberScale, density } = props;
  const lines = [{ text: children, role, numberScale }];
  return kit.useComponentState() === "loading" ? (
    <kit.KitSkeleton shape="figure" inset="none" {...{ lines, density }} />
  ) : (
    <KitText {...props} role={role} children={children} />
  );
}

function SetPoint({ row, disabled, focused, reading }: Tile & { reading?: ReactNode }) {
  const { lang, words } = useWords(homeWordsFor);
  const { min, max } = home.thermostatBounds;
  const value = row.temp!;
  const step = meta.items.adjust["plus.increment"].delta;
  const { decrease, increase } = words.devicePanel;
  const { setPoint } = words.deviceLabels;
  const caption = words.devicePanel.measure(setPoint, words.deviceUnits.celsius);
  const number = numberLine(value, lang);
  const target = (
    <kit.KitContent>
      <DeviceText role="label" tone="muted" part={null} children={caption} />
      <DeviceText role="number" numberScale={focused ? "display" : "compact"} part={null} children={number} />
    </kit.KitContent>
  );
  return (
    <kit.KitContent>
      <kit.KitGrid arrange={reading ? "grid" : "rows"}>
        {reading}
        {target}
      </kit.KitGrid>
      <kit.KitSlider part="temp" label={setPoint} {...{ min, max, step, value, disabled }} />
      <kit.KitGrid>
        {(
          [
            { part: "minus", action: "decrement", a11y: decrease, disabled: disabled || value <= min },
            { part: "plus", action: "increment", a11y: increase, disabled: disabled || value >= max },
          ] as const
        ).map((key) => (
          <KitAction key={key.part} icon={key.part} kind="secondary" full {...key} />
        ))}
      </kit.KitGrid>
    </kit.KitContent>
  );
}

function Reading({ row, focused }: Pick<Tile, "row" | "focused">) {
  const { lang, words } = useWords(homeWordsFor);
  const loading = kit.useComponentState() === "loading";
  if (row.reading === undefined) return null;
  const range = deviceRange(row, lang);
  const tone = range?.outside ? "warn" : "text";
  const unit = row.unit ?? "celsius";
  const value = focused ? numberLine(row.reading, lang) : deviceValue(row.reading, unit, lang);
  const label = words.deviceLabels.reading;
  const caption = focused ? words.devicePanel.measure(label, words.deviceUnits[unit]) : label;
  const part = range ? null : "reading";
  const content = <DeviceText role="number" numberScale="compact" {...{ tone, part }} children={value} />;
  return (
    <kit.KitContent>
      <DeviceText role="label" tone="muted" part={null} children={caption} />
      {range ? (
        <kit.KitRangeBand {...range} part="reading" reading={content} {...{ tone, loading }} />
      ) : (
        content
      )}
      {range && <DeviceText role="label" tone="muted" part={null} children={range.label} />}
      {range?.status && !loading && <KitText role="label" part={null} tone="warn" children={range.status} />}
    </kit.KitContent>
  );
}

function DeviceTile({ row, disabled, focused }: Tile) {
  const { words } = useWords(homeWordsFor);
  const { deviceLabels: labels, devicePanel: panel } = words;
  const scope = { ...kit.usePartContext(), item: row.id };
  const locked = kit.useControlValue(formatAddress({ ...scope, part: "lock" }), row.on);
  const level = kit.useControlValue(formatAddress({ ...scope, part: "level" }), row.level);
  const lockLabel = locked ? labels.locked : labels.unlocked;
  const { goto } = row;
  const levelLabel = panel.level[row.kind as keyof typeof panel.level];
  const toggle = row.switchable && (
    <kit.KitTrail kind="toggle" part="root" on={row.on ?? false} {...{ disabled }} />
  );
  const name = <DeviceText role={focused ? "heading" : "label"} part="name" children={row.name} />;
  const details = goto && (
    <KitAction part="controls" kind="quiet" label={panel.controls} {...{ goto, disabled }} />
  );
  const reading = row.reading !== undefined && <Reading {...{ row, focused }} />;
  return (
    <kit.KitRow item={row.id} part={row.switchable ? null : "root"} label={row.name} surface="card">
      <kit.KitContent>
        {focused && (
          <kit.KitGrid arrange={details ? "grid" : "rows"} fitLast>
            <DeviceText role="label" density="compact" tone="muted" part="room" children={row.room} />
            {details}
          </kit.KitGrid>
        )}
        <kit.KitGrid arrange={toggle ? "grid" : "rows"} fitLast>
          {name}
          {toggle}
        </kit.KitGrid>
        {row.kind === "lock" && (
          <KitAction part="lock" kind="secondary" action="toggle" label={lockLabel} disabled={disabled} />
        )}
        {!focused && reading}
        {row.temp !== undefined ? (
          <SetPoint {...{ row, focused, disabled }} reading={focused && reading} />
        ) : (
          focused && reading
        )}
        {levelLabel && level !== undefined && (
          <kit.KitSlider part="level" label={levelLabel} max={100} value={level} disabled={disabled} />
        )}
        {!focused && details}
      </kit.KitContent>
    </kit.KitRow>
  );
}

export function Devices({ entries, focus, style, rooms }: DevicePanel) {
  const state = kit.useComponentState();
  const scope = kit.usePartContext();
  const panel = useWords(homeWordsFor).words.devicePanel;
  const devices = entries.filter((row) => row.entryKind === "device");
  const scenes = entries.filter((row) => row.entryKind === "scene");
  const focused = style === "focused" ? focusedDevice(devices, focus) : undefined;
  const roomOrder = new Set([...(focused ? [focused.roomIndex] : []), ...rooms.keys()]);
  const disabled = state !== "filled";
  const sceneAction = focused ? "secondary" : "quiet";
  const tile = (row: Device) => <DeviceTile key={row.id} {...{ row, disabled }} focused={row === focused} />;
  if (state === "empty") return <kit.KitCard children={<kit.KitEmpty decorativeIcon />} />;
  const saved = scenes.length > 0 && (
    <kit.KitContent group={focused ? "response" : "content"}>
      <DeviceText role="label" tone="muted" part={null} children={panel.scenes} />
      <kit.KitGrid arrange={scenes.length === 1 ? "rows" : "grid"}>
        {scenes.map((row) => {
          const part = row.secure ? "secure" : "apply";
          return (
            <kit.KitRow key={row.id} item={row.id} label={row.name} surface="card">
              <kit.KitGrid arrange={scenes.length === 1 ? "grid" : "rows"} fitLast>
                <DeviceText role="label" density="compact" part="name" children={row.name} />
                <KitAction kind={sceneAction} label={panel[part]} {...{ part, disabled }} />
              </kit.KitGrid>
            </kit.KitRow>
          );
        })}
      </kit.KitGrid>
    </kit.KitContent>
  );
  return (
    <kit.KitCard style="plain" part="root" padded inset="none">
      <DeviceText role="label" part={null} tone="muted" children={panel.preview} />
      {(state === "error" || state === "success") && (
        <KitText role="body" part={null} tone={state === "error" ? "bad" : "good"} children={panel[state]} />
      )}
      {focused ? tile(focused) : saved}
      {[...roomOrder].map((index) => {
        const { label } = rooms[index]!;
        const tiles = devices.filter((row) => row !== focused && row.roomIndex === index);
        if (!tiles.length) return null;
        const arrange = tiles.some((row) => row.switchable) ? "rows" : "grid";
        return (
          <kit.KitContent key={index} group="response">
            {focused?.roomIndex !== index && (
              <kit.PartContext.Provider value={{ ...scope, item: tiles[0]!.id }}>
                <DeviceText role="heading" part="room" children={label} />
              </kit.PartContext.Provider>
            )}
            <kit.KitGrid {...{ arrange }} children={tiles.map(tile)} />
          </kit.KitContent>
        );
      })}
      {focused && saved}
    </kit.KitCard>
  );
}
