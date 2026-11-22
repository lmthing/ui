import React from "react";
import { createRoot } from "react-dom/client";
import { TamaguiProvider } from "tamagui";
import { components, themeName } from "@lmthing/ui/catalog";
import { PhoneScreen } from "@lmthing/ui/kit";
import { config } from "../../../../../test/render";
import { Collection, Library, Playlist } from "../../components";

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const defs = {
  Library: components.Library,
  Collection: components.Collection,
  Playlist: components.Playlist,
};
const renderers = {
  Library: Library.Library,
  Collection: Collection.Collection,
  Playlist: Playlist.Playlist,
};
const shelf = Library.examples.find((example) => "arrange" in example && example.arrange === "strip")!;
const book = Collection.examples.find((example) => "style" in example && example.style === "book")!;
const queue = Playlist.examples.find((example) => "style" in example && example.style === "queue")!;
const screen = {
  id: "media",
  components: [
    { id: "saved", c: "Library", ...shelf },
    { id: "book", c: "Collection", ...book },
    { id: "queue", c: "Playlist", ...queue },
  ],
};

function record(message: string) {
  document.querySelector("output")!.textContent = message;
}

createRoot(document.getElementById("root")!).render(
  <TamaguiProvider config={config} defaultTheme={themeName(theme)}>
    <PhoneScreen
      {...{ defs, renderers, screen, theme }}
      reduceMotion
      onAction={({ address, action }) => record(`${address} ${action}`)}
      onLink={(goto) => record(`open ${goto}`)}
    />
    <output />
  </TamaguiProvider>,
);
