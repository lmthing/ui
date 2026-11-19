import { createRoot } from "react-dom/client";
import { App } from "./App";
import { reloadOnce } from "./shared/lazyChunk";
import "./styles/base.css";
import "./styles/sections.css";
import "./styles/parts.css";
import "./styles/chrome.css";
import "./styles/phone.css";
import "./styles/home.css";
import "./styles/pipeline.css";
import "./styles/packs.css";
import "./styles/specimens.css";
import "./styles/try.css";
import "./styles/controls.css";
import "./styles/playground.css";

// Vite reports a failed chunk preload (a stale tab after a deploy); one reload fetches the new build.
addEventListener("vite:preloadError", () => void reloadOnce());

const root = document.getElementById("root");
if (!root) throw new Error("Root element is missing");
createRoot(root).render(<App />);
