import { createRoot } from "react-dom/client";
import { Gallery } from "./app";

const root = document.getElementById("root");
if (!root) throw new Error("Gallery root is missing");
createRoot(root).render(<Gallery />);
