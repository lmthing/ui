import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles/base.css";
import "./styles/parts.css";
import "./styles/chrome.css";
import "./styles/phone.css";
import "./styles/home.css";
import "./styles/packs.css";
import "./styles/specimens.css";
import "./styles/try.css";
import "./styles/playground.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element is missing");
createRoot(root).render(<App />);
