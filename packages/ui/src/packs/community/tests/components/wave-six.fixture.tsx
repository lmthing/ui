import { useState } from "react";
import { createRoot } from "react-dom/client";
import { TamaguiProvider } from "tamagui";
import { components, type ActStep } from "@lmthing/ui/catalog";
import { PhoneScreen, renderers } from "@lmthing/ui/kit";
import { config } from "../../../../../test/render";
import { voteRecordKind } from "../../copy";

const seed = components.Vote.props.parse(components.Vote.examples[4]);
const now = Date.now();
const opens = new Date(now - 60_000).toISOString();
const closes = new Date(now + 600_000).toISOString();
const arrange = location.search.includes("rows") ? ("rows" as const) : ("grid" as const);
const screen = {
  id: "home",
  components: [{ ...components.Vote.examples[4]!, c: "Vote", id: "vote", opens, closes, arrange }],
};

function ElectionFixture() {
  const [choice, setChoice] = useState<string[] | "abstain">(["ana"]);
  const onAction = ({ action, address }: ActStep) => {
    if (action !== "select") return;
    const target = address.split("/").at(-1);
    const value = target === "abstain" ? target : seed.candidates?.[Number(target?.slice(1)) - 1]?.id;
    if (!value) return;
    if (value === "abstain") return setChoice("abstain");
    setChoice((prev) => {
      if (prev === "abstain") return [value];
      if (!prev.includes(value)) return [...prev, value];
      const remaining = prev.filter((id) => id !== value);
      return remaining.length ? remaining : "abstain";
    });
  };
  return (
    <PhoneScreen
      defs={{ Vote: components.Vote }}
      renderers={renderers}
      screen={screen}
      theme={{ preset: "calm", mode: "light", accent: "moss" }}
      onAction={onAction}
      deviceData={{
        [voteRecordKind]: [
          {
            ...seed,
            opens,
            closes,
            eligible: ["cal"],
            viewer: "cal",
            ballots: [{ memberId: "cal", choice }],
          },
        ],
      }}
    />
  );
}

createRoot(document.getElementById("root")!).render(
  <TamaguiProvider config={config} defaultTheme="kit_calm_light_moss">
    <ElectionFixture />
  </TamaguiProvider>,
);
