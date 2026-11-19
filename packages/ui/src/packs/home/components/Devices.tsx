import { formatAddress, numberLine, type Meta, type Props } from "../../../catalog";
import { KitAction, KitText, useWords } from "../../../kit";
import * as kit from "../../../kit";
import {
  deviceControls,
  deviceExamples,
  deviceFallback,
  deviceProbes,
  deviceProps,
  deviceWriteHints,
  readDevices,
  thermostatBounds,
} from "..";
import { deviceRange, deviceValue, focusedDevice } from "../copy";
import { homeWordsFor } from "../lang";
// Core first: Field/slider stores a preference, not live device commands, readings or scenes.
export const meta = {
  id: "Devices",
  status: "ready",
  group: "input",
  purpose: "Read and control connected household devices and apply saved settings together.",
  pick: "Connected household devices: switches, thermostat reading and set point, sensor ranges and multi-device scenes. Not local preference rows with trailing switches (List), one labelled form value (Field), navigation (Actions), independent manual summary measurements (Stats), recent manual history (Sparkline), or a person's body readings (Vitals).",
  writeHints: deviceWriteHints,
  region: "body",
  weight: 3,
  dense: true,
  tier: "service",
  realPath:
    "A host adapter maps device keys to a smart-home service, supplies readings and command acknowledgements; without it this is a labelled mock.",
  items: {
    key: "entries",
    set: { temp: { prop: "temp", min: 5, max: 30 } },
    adjust: {
      "plus.increment": { prop: "temp", delta: 0.5 },
      "minus.decrement": { prop: "temp", delta: -0.5 },
    },
    parts: deviceControls.parts,
  },
  parts: ["root"],
  confirmParts: ["lock", "secure"],
  states: ["filled", "empty", "loading", "success", "error"],
  actions: deviceControls.actions,
  read: readDevices,
} as const satisfies Meta;
export const props = deviceProps;
export const fallback = deviceFallback;
export const examples = deviceExamples;
export const probes = deviceProbes;

type DevicePanel = Props<typeof props, typeof meta>;
type Device = Extract<DevicePanel["entries"][number], { entryKind: "device" }>;
type Tile = { row: Device; disabled: boolean; focused: boolean };

function SetPoint({ row, disabled, focused }: Tile) {
  const { lang, words } = useWords(homeWordsFor);
  const { min, max } = thermostatBounds;
  const value = row.temp!;
  const step = meta.items.adjust["plus.increment"].delta;
  const { decrease, increase } = words.devicePanel;
  const { setPoint } = words.deviceLabels;
  const caption = words.devicePanel.measure(setPoint, words.deviceUnits.celsius);
  const number = numberLine(value, lang);
  const numberScale = focused ? "display" : "compact";
  return (
    <kit.KitContent>
      <KitText role="label" tone="muted" part={null} children={caption} />
      <KitText role="number" numberScale={numberScale} part={null} children={number} />
      <kit.KitSlider part="temp" label={setPoint} {...{ min, max, step, value, disabled }} />
      <kit.KitGrid>
        {(
          [
            { part: "minus", action: "decrement", a11y: decrease, disabled: disabled || value <= min },
            { part: "plus", action: "increment", a11y: increase, disabled: disabled || value >= max },
          ] as const
        ).map((key) => (
          <KitAction key={key.part} icon={key.part} kind="secondary" {...key} />
        ))}
      </kit.KitGrid>
    </kit.KitContent>
  );
}

function Reading({ row, focused }: Pick<Tile, "row" | "focused">) {
  const { lang, words } = useWords(homeWordsFor);
  if (row.reading === undefined) return null;
  const range = deviceRange(row, lang);
  const tone = range?.outside ? "warn" : "text";
  const unit = row.unit ?? "celsius";
  const value = focused ? numberLine(row.reading, lang) : deviceValue(row.reading, unit, lang);
  const label = words.deviceLabels.reading;
  const caption = focused ? words.devicePanel.measure(label, words.deviceUnits[unit]) : label;
  const numberScale = focused ? "display" : "compact";
  const content = (
    <KitText role="number" {...{ numberScale, tone }} part={range ? null : "reading"} children={value} />
  );
  return (
    <kit.KitContent>
      <KitText role="label" tone="muted" part={null} children={caption} />
      {range ? <kit.KitRangeBand {...range} part="reading" reading={content} tone={tone} /> : content}
      {range && <KitText role="label" tone="muted" part={null} children={range.label} />}
      {range?.status && <KitText role="label" part={null} tone="warn" children={range.status} />}
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
  const name = <KitText role={focused ? "heading" : "label"} part="name" children={row.name} />;
  const header = focused && toggle && (
    <kit.KitRow inline label={row.name} trailing={toggle} children={name} />
  );
  const paired = focused && row.temp !== undefined && row.reading !== undefined;
  const metrics = [
    <Reading key="reading" {...{ row, focused }} />,
    row.temp !== undefined && <SetPoint key="setPoint" {...{ row, focused, disabled }} />,
  ];
  return (
    <kit.KitRow item={row.id} part={row.switchable ? null : "root"} label={row.name} surface="card">
      <kit.KitContent>
        <KitText role="label" tone="muted" part="room" children={row.room} />
        {header || name}
        {row.kind === "lock" && (
          <KitAction part="lock" kind="secondary" action="toggle" label={lockLabel} disabled={disabled} />
        )}
        {paired ? <kit.KitGrid>{metrics}</kit.KitGrid> : metrics}
        {levelLabel && level !== undefined && (
          <kit.KitSlider part="level" label={levelLabel} max={100} value={level} disabled={disabled} />
        )}
        {!focused && toggle}
        {goto && <KitAction part="controls" kind="quiet" label={panel.controls} {...{ goto, disabled }} />}
      </kit.KitContent>
    </kit.KitRow>
  );
}

export function Devices({ entries, focus, style, rooms }: DevicePanel) {
  const state = kit.useComponentState();
  const panel = useWords(homeWordsFor).words.devicePanel;
  const devices = entries.filter((row) => row.entryKind === "device");
  const scenes = entries.filter((row) => row.entryKind === "scene");
  const focused = style === "focused" ? focusedDevice(devices, focus) : undefined;
  const disabled = state !== "filled";
  const tile = (row: Device) => <DeviceTile key={row.id} {...{ row, disabled }} focused={row === focused} />;
  if (state === "empty")
    return (
      <kit.KitCard>
        <kit.KitEmpty decorativeIcon />
      </kit.KitCard>
    );
  if (state === "loading")
    return (
      <kit.KitCard padded>
        <kit.KitSkeleton shape={focused ? "headline" : "rows"} rows={entries.length} inset="none" />
      </kit.KitCard>
    );
  return (
    <kit.KitCard style="plain" part="root" padded inset="none">
      <KitText role="label" part={null} tone="muted" children={panel.preview} />
      {(state === "error" || state === "success") && (
        <KitText role="body" part={null} tone={state === "error" ? "bad" : "good"} children={panel[state]} />
      )}
      {focused && tile(focused)}
      {scenes.length > 0 && (
        <kit.KitContent>
          <KitText role="label" tone="muted" part={null} children={panel.scenes} />
          <kit.KitGrid>
            {scenes.map((row) => {
              const part = row.secure ? "secure" : "apply";
              return (
                <kit.KitRow key={row.id} item={row.id} label={row.name} surface="card">
                  <kit.KitContent>
                    <KitText role="label" density="compact" part="name" children={row.name} />
                    <KitAction kind="secondary" label={panel[part]} {...{ part, disabled }} />
                  </kit.KitContent>
                </kit.KitRow>
              );
            })}
          </kit.KitGrid>
        </kit.KitContent>
      )}
      {rooms.map((_, index) => (
        <kit.KitGrid key={index}>
          {devices.filter((row) => row !== focused && row.roomIndex === index).map(tile)}
        </kit.KitGrid>
      ))}
    </kit.KitCard>
  );
}
