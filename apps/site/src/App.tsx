import { lazy } from "react";
import { Landing } from "./landing/Landing";
import { useRoute } from "./router";
import { Footer } from "./shell/Footer";
import { Header } from "./shell/Header";
import { NotFound } from "./shell/NotFound";
import { Lazy } from "./shared/Lazy";
import { ThemeProvider } from "./theme/ThemeContext";

const ComponentPage = lazy(() => import("./playground/ComponentPage"));
const ComponentsPage = lazy(() => import("./index/ComponentsPage"));
const PackPage = lazy(() => import("./packs/PackPage"));

export function App() {
  const route = useRoute();
  return (
    <ThemeProvider>
      <Header />
      {route.name === "home" && <Landing />}
      {route.name === "components" && <Lazy view={ComponentsPage} />}
      {route.name === "component" && <Lazy view={ComponentPage} id={route.id} />}
      {route.name === "missing" && <NotFound what={`page at ${route.path}`} />}
      {route.name === "pack" && <Lazy view={PackPage} id={route.id} />}
      <Footer />
    </ThemeProvider>
  );
}
