import type { ComponentProps, ReactNode } from "react";
import { formatAddress, numberLine, type Meta, type Props } from "../../../catalog";
import { KitAction, KitText, useWords } from "../../../kit";
import * as kit from "../../../kit";
import * as home from "..";
import { deviceRange, deviceValue, focusedDevice, thermostatCopy } from "../copy";
import { homeWordsFor } from "../lang";
// Core first: Field/slider stores a preference, not live device commands, readings or scenes.
export const meta = {
  id: "Devices",
  status: "ready",
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
type DeviceTileProps = Tile & Pick<DevicePanel, "group" | "surface">;
function DeviceText({ children, ...props }: ComponentProps<typeof KitText> & { children: string }) {
  const { role = "label", numberScale, density, align } = props;
  const lines = [{ text: children, role, numberScale, align }];
  return kit.useComponentState() === "loading" ? (
    <kit.KitSkeleton shape="figure" inset="none" {...{ lines, density }} />
  ) : (
    <KitText {...props} role={role} children={children} />
  );
}
// prettier-ignore
function SetPoint({ row, disabled, focused, reading }: Tile & { reading?: ReactNode }) {
  const { lang, words } = useWords(homeWordsFor);
  const { min, max } = home.thermostatBounds;
  const value = row.temp!, coolTemp = row.coolTemp, hasCooling = coolTemp !== undefined;
  const step = meta.items.adjust["plus.increment"].delta;
  const { decrease, increase } = hasCooling ? words.thermostat : words.devicePanel;
  const { setPoint, mode, heatingCaption, coolingCaption } = thermostatCopy(row, lang);
  const measure = (label: string) => words.devicePanel.measure(label, words.deviceUnits.celsius);
  const target = (
    <kit.KitContent>
      <DeviceText role="label" tone="muted" part={null} children={measure(heatingCaption)} />
      <DeviceText role="number" numberScale={focused ? "display" : "compact"} part={null} children={numberLine(value, lang)} />
    </kit.KitContent>
  );
  return (
    <kit.KitContent>
      {mode && <DeviceText part="mode" tone="muted" children={mode} />}
      <kit.KitGrid arrange={reading || hasCooling ? "grid" : "rows"} columns={reading && hasCooling ? 3 : 2}>
        {reading}
        {target}
        {hasCooling && (
          <kit.KitContent>
            <DeviceText role="label" tone="muted" part={null} children={measure(coolingCaption)} />
            <DeviceText role="number" numberScale="compact" part="cool_temp" children={numberLine(coolTemp, lang)} />
          </kit.KitContent>
        )}
      </kit.KitGrid>
      {hasCooling && <kit.KitContent group="response"><DeviceText role="label" part={null} children={words.thermostat.adjustHeat} /></kit.KitContent>}
      <kit.KitSlider part="temp" label={setPoint} {...{ min, max, step, value, disabled }} />
      <kit.KitGrid>
        <KitAction part="minus" action="decrement" icon="minus" a11y={decrease} kind="secondary" full disabled={disabled || value <= min} />
        <KitAction part="plus" action="increment" icon="plus" a11y={increase} kind="secondary" full disabled={disabled || value >= max} />
      </kit.KitGrid>
    </kit.KitContent>
  );
}
// prettier-ignore
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
      {range ? <kit.KitRangeBand {...range} part="reading" reading={content} {...{ tone, loading }} /> : content}
      {range && <DeviceText role="label" tone="muted" part={null} children={range.label} />}
      {range?.status && !loading && <KitText role="label" part={null} tone="warn" children={range.status} />}
    </kit.KitContent>
  );
}
// prettier-ignore
function DeviceTile({ row, disabled, focused, group, surface }: DeviceTileProps) {
  const { words } = useWords(homeWordsFor);
  const { deviceLabels: labels, devicePanel: panel } = words;
  const scope = { ...kit.usePartContext(), item: row.id };
  const locked = kit.useControlValue(formatAddress({ ...scope, part: "lock" }), row.on);
  const level = kit.useControlValue(formatAddress({ ...scope, part: "level" }), row.level);
  const lockLabel = locked ? labels.locked : labels.unlocked;
  const levelLabel = panel.level[row.kind as keyof typeof panel.level];
  const toggle = row.switchable && (
    <kit.KitTrail kind="toggle" part="root" on={row.on ?? false} {...{ disabled }} />
  );
  const name = <DeviceText role={focused ? "heading" : "label"} part="name" children={row.name} />;
  const link = { goto: row.goto, disabled };
  const details = row.goto && <KitAction part="controls" kind="quiet" label={panel.controls} {...link} />;
  const reading = row.reading !== undefined && <Reading {...{ row, focused }} />;
  const simpleSwitch = row.switchable && !focused && !details && !reading && level === undefined && row.temp === undefined;
  return (
    <kit.KitRow item={row.id} part={row.switchable ? null : "root"} label={row.name} density={simpleSwitch ? "compact" : undefined} {...{ surface }}>
      <kit.KitContent>
        {focused && (group === "sections" || details) && (
          <kit.KitGrid arrange={details && group === "sections" ? "grid" : "rows"} fitLast>
            {group === "sections" && <DeviceText role="label" density="compact" tone="muted" part="room" children={row.room} />}
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
// prettier-ignore
export function Devices({ entries, focus, style, rooms, group, surface }: DevicePanel) {
  const state = kit.useComponentState();
  const scope = kit.usePartContext(), panel = useWords(homeWordsFor).words.devicePanel;
  const devices = entries.filter((row) => row.entryKind === "device");
  const scenes = entries.filter((row) => row.entryKind === "scene");
  const focused = style === "focused" ? focusedDevice(devices, focus) : undefined;
  const disabled = state !== "filled";
  const kind = focused ? "secondary" : "quiet";
  const multi = scenes.length > 1;
  const tile = (row: Device) => <DeviceTile key={row.id} {...{ row, disabled, group, surface }} focused={row === focused} />;
  if (state === "empty") return <kit.KitCard children={<kit.KitEmpty decorativeIcon />} />;
  const saved = scenes.length > 0 && (
    <kit.KitContent group={focused ? "response" : "content"}>
      <DeviceText role="label" tone="muted" part={null} children={panel.scenes} />
      <kit.KitGrid arrange={multi ? "grid" : "rows"}>
        {scenes.map((row) => {
          const part = row.secure ? "secure" : "apply";
          const title = { align: multi ? "center" : "start", density: "compact", part: "name" } as const;
          return (
            <kit.KitRow key={row.id} item={row.id} label={row.name} {...{ surface }}>
              <kit.KitGrid arrange={multi ? "rows" : "grid"} fitLast>
                <DeviceText {...title} children={row.name} />
                <KitAction full={multi} label={panel[part]} {...{ kind, part, disabled }} />
              </kit.KitGrid>
            </kit.KitRow>
          );
        })}
      </kit.KitGrid>
    </kit.KitContent>
  );
  const remaining = devices.filter((row) => row !== focused);
  const tiles = (rows: Device[], arrange: "rows" | "grid") =>
    <kit.KitGrid list listRowGap="cards" {...{ arrange }} children={rows.map(tile)} />;
  const roomOrder = new Set([...(focused ? [focused.roomIndex] : []), ...rooms.keys()]);
  return (
    <kit.KitCard style="plain" part="root" padded inset="none">
      <DeviceText role="label" part={null} tone="muted" children={panel.preview} />
      {(state === "error" || state === "success") && (
        <KitText role="body" part={null} tone={state === "error" ? "bad" : "good"} children={panel[state]} />
      )}
      {focused ? tile(focused) : saved}
      {group === "none" ? remaining.length > 0 && <kit.KitContent group="response">{tiles(remaining, "rows")}</kit.KitContent> : [...roomOrder].map((index) => {
        const rows = remaining.filter((row) => row.roomIndex === index);
        if (!rows.length) return null;
        const arrange = rows.some((row) => row.switchable) ? "rows" : "grid";
        return (
          <kit.KitContent key={index} group="response">
            {focused?.roomIndex !== index && (
              <kit.PartContext.Provider value={{ ...scope, item: rows[0]!.id }}>
                <DeviceText role="heading" part="room" children={rooms[index]!.label} />
              </kit.PartContext.Provider>
            )}
            {tiles(rows, arrange)}
          </kit.KitContent>
        );
      })}
      {focused && saved}
    </kit.KitCard>
  );
}
