import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { TamaguiProvider } from "tamagui";
import {
  KitCalcPad,
  KitDialGauge,
  KitLetterKeys,
  KitProvider,
  KitText,
  KitVoiceOrb,
  PartScope,
} from "@lmthing/ui/kit";
import { config } from "../../render";
import { useFixtureController } from "./fixture-controller";

const theme = { preset: "calm", mode: "light", accent: "moss", motion: "lively" } as const;
const calc = [
  { id: "r1", label: "7", value: "7" },
  { id: "r2", label: "Add", value: "+", role: "op" },
  { id: "r3", label: "Equals", value: "=", role: "eq" },
  { id: "r4", label: "Root", value: "sqrt(", role: "fn", disabled: true },
  { id: "r5", label: "Sine", value: "sin(", role: "fn" },
] as const;
const letters = Array.from("QWERTYUIOPASDFGHJKLZXCVBNM", (value, i) => ({
  id: `r${i + 1}`,
  label: [`${value}`, `${value}, correct`, `${value}, present`, `${value}, absent`][i % 4]!,
  value,
  state: (["unused", "correct", "present", "absent"] as const)[i % 4]!,
  center: i === 2,
  target: i === 1 ? { item: "r2", part: "letter" } : { part: "root" },
}));

function keyFixture(hive: boolean, coincident: boolean) {
  if (coincident) return [{ id: "letter-q", label: "Q", value: "Q", target: { part: "root" } }];
  if (!hive) return letters;
  return letters.slice(0, 8).map((key) => (key.center ? { ...key, label: `${key.label}, required` } : key));
}

function Radial({
  loading,
  level,
  muted,
  thinking,
  coincident,
}: {
  loading: boolean;
  level: number;
  muted: boolean;
  thinking: boolean;
  coincident: boolean;
}) {
  const state = muted
    ? "idle"
    : thinking
      ? "thinking"
      : !level
        ? "idle"
        : level === 1
          ? "speaking"
          : "listening";
  return (
    <>
      <PartScope screen="home" component="voice" rev={1} state="filled">
        <KitVoiceOrb
          loading={loading}
          state={state}
          level={muted ? 0 : level}
          label={muted ? "Resume voice" : "Interrupt voice"}
          target={{ part: coincident ? "root" : "orb" }}
        >
          {muted ? <KitText part={null}>Muted</KitText> : undefined}
        </KitVoiceOrb>
      </PartScope>
      <PartScope screen="home" component="dial" rev={1} state="filled">
        <KitDialGauge
          loading={loading}
          ratio={level}
          value={String(level * 100)}
          unit="units"
          phase={level ? "Measuring" : "Idle"}
          scaleLabels={["0", "50", "100"]}
        />
      </PartScope>
    </>
  );
}

function Fixture() {
  const [loading, setLoading] = useState(false);
  const [scientific, setScientific] = useState(false);
  const [hive, setHive] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [level, setLevel] = useState(0);
  const [muted, setMuted] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [coincident, setCoincident] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [action, setAction] = useState("");
  const record = React.useCallback((value: string) => setAction((old) => `${old}\n${value}`), []);
  const controller = useFixtureController(!blocked, letters, record);
  const toggles = [
    ["Loading", () => setLoading(!loading)],
    ["Scientific", () => setScientific(!scientific)],
    ["Hive", () => setHive(!hive)],
    ["Disabled", () => setDisabled(!disabled)],
    ["Update level", () => setLevel((old) => (old >= 1 ? 0 : old + 0.5))],
    ["Mute", () => setMuted(!muted)],
    ["Think", () => setThinking(!thinking)],
    ["Coincident", () => setCoincident(!coincident)],
    ["Block actions", () => setBlocked(!blocked)],
  ] as const;
  return (
    <TamaguiProvider config={config} defaultTheme="kit_calm_light_moss">
      {toggles.map(([label, onClick]) => (
        <button key={label} type="button" onClick={onClick}>
          {label}
        </button>
      ))}
      <output>{action}</output>
      <KitProvider theme={theme} interactive controller={controller}>
        <PartScope screen="home" component="calc" rev={1} state="filled">
          <KitCalcPad
            keys={calc}
            target={{ part: coincident ? "root" : "keys" }}
            {...{ scientific, loading, disabled }}
          />
        </PartScope>
        <PartScope screen="home" component="letters" rev={1} state="filled">
          <KitLetterKeys
            layout={hive ? "hive" : "qwerty"}
            keys={keyFixture(hive, coincident)}
            {...{ loading, disabled }}
          />
        </PartScope>
        <Radial {...{ loading, level, muted, thinking, coincident }} />
      </KitProvider>
    </TamaguiProvider>
  );
}

createRoot(document.getElementById("root")!).render(<Fixture />);
