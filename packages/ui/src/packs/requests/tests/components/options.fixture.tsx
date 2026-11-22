import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { TamaguiProvider } from "tamagui";
import { components, type ScreenLike } from "@lmthing/ui/catalog";
import { PhoneScreen } from "@lmthing/ui/kit";
import { config } from "../../../../../test/render";

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const { CannedReplies, RequestQueue, RequestThread, WorkOrder } = components;
const mine = RequestQueue.examples[2]!.rows;
const unassigned = RequestQueue.examples[0]!.rows[1]!;
const completed = RequestQueue.examples[1]!.rows[0]!;
const replies = CannedReplies.examples[0]!;
const deviceData = {
  requestQueue: [{ now: Date.parse("2026-11-22T12:00:00Z"), mine: [mine[0]!.number, completed.number] }],
};
const screen: ScreenLike = {
  id: "desk",
  components: [
    { c: "RequestQueue", id: "queue", style: "mine", rows: [...mine, unassigned, completed] },
    { c: "CannedReplies", id: "replies", ...replies, categories: [...replies.categories, "Scheduling"] },
    { c: "RequestThread", id: "thread", ...RequestThread.examples[4]! },
    { c: "WorkOrder", id: "work", ...WorkOrder.examples[2]! },
  ],
};

function Options() {
  const [events, setEvents] = useState<string[]>([]);
  const record = (event: string) => setEvents((previous) => [...previous, event]);
  return (
    <TamaguiProvider config={config}>
      <output id="events">{events.join("\n")}</output>
      <PhoneScreen
        theme={theme}
        screen={screen}
        deviceData={deviceData}
        onLink={(goto) => record(goto)}
        onSend={() => record("send")}
        onAction={({ address }) => {
          if (address.endsWith("/finish")) record("finish");
        }}
        reduceMotion
      />
    </TamaguiProvider>
  );
}

createRoot(document.getElementById("root")!).render(<Options />);
