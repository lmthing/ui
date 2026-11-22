import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { TamaguiProvider } from "tamagui";
import { components, type ActStep, type ScreenLike } from "@lmthing/ui/catalog";
import { PhoneScreen } from "@lmthing/ui/kit";
import { config } from "../../../../../test/render";

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const screen: ScreenLike = {
  id: "home",
  components: [
    { c: "Units", id: "units", ...components.Units.examples[2]! },
    { c: "RentRoll", id: "rent", ...components.RentRoll.examples[3]! },
    { c: "Inspections", id: "inspection", ...components.Inspections.examples[2]! },
    { c: "Viewings", id: "viewings", ...components.Viewings.examples[1]! },
    { c: "Meters", id: "meters", ...components.Meters.examples[1]! },
  ],
};

function PropertyOptions() {
  const [actions, setActions] = useState<string[]>([]);
  const [updateState, setUpdateState] = useState<"filled" | "error" | "success">("filled");
  const onAction = ({ address, action }: ActStep) => {
    setActions((previous) => [...previous, `${address} ${action}`]);
    if (address === "home/update/r2/confirm") setUpdateState("error");
    if (address === "home/update/retry") setUpdateState("success");
  };
  const withUpdate = {
    ...screen,
    components: [
      ...screen.components,
      { c: "Viewings", id: "update", ...components.Viewings.examples[0]!, state: updateState },
    ],
  };
  return (
    <TamaguiProvider config={config}>
      <output id="actions">{actions.join("\n")}</output>
      <PhoneScreen theme={theme} screen={withUpdate} onAction={onAction} reduceMotion />
    </TamaguiProvider>
  );
}

createRoot(document.getElementById("root")!).render(<PropertyOptions />);
