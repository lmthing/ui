import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { TamaguiProvider } from "tamagui";
import type { ActStep, ScreenLike } from "@lmthing/ui/catalog";
import { PhoneScreen } from "@lmthing/ui/kit";
import { config } from "../../../../../test/render";

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const paymentLink = "https://example.com/pay/trot";
const fixture: ScreenLike = {
  id: "home",
  components: [
    {
      c: "ClientCard",
      id: "client",
      name: "Ben",
      media: "none",
      tags: [],
      phone: false,
      address: false,
      email: true,
    },
    {
      c: "Invoice",
      id: "invoice",
      style: "estimate",
      to: "Ben",
      date: "2026-11-18",
      status: "draft",
      lines: [{ item: "Walk", qty: 2, price: 20 }],
      download: true,
    },
    {
      c: "PaymentStatus",
      id: "payment",
      amount: 40,
      date: "2026-11-18",
      style: "link",
      paymentLink,
      installments: [{ amount: 20, date: "2026-11-17" }],
    },
  ],
};

function Options() {
  const [screen, setScreen] = useState(fixture);
  const [clipboard, setClipboard] = useState("");
  const [steps, setSteps] = useState<string[]>([]);
  const onAction = ({ address, action }: ActStep) =>
    setSteps((previous) => [...previous, `${address} ${action}`]);
  const settle = () =>
    setScreen({
      ...fixture,
      components: fixture.components.map((entry) =>
        entry.id === "payment" ? { ...entry, paid: entry.amount } : entry,
      ),
    });
  return (
    <TamaguiProvider config={config}>
      <button onClick={settle}>Settle payment</button>
      <output id="clipboard">{clipboard}</output>
      <output id="actions">{steps.join("\n")}</output>
      <PhoneScreen
        theme={theme}
        screen={screen}
        onAction={onAction}
        writeClipboard={setClipboard}
        reduceMotion
      />
    </TamaguiProvider>
  );
}

createRoot(document.getElementById("root")!).render(<Options />);
