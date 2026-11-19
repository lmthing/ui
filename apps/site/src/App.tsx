import { lazy } from "react";
import { site } from "./data/site";
import { Landing } from "./landing/Landing";
import { useRoute } from "./router";
import { Lazy } from "./shared/Lazy";
import { ThemeProvider } from "./theme/ThemeContext";
import { ThemeSwitcher } from "./theme/ThemeSwitcher";

const ComponentPage = lazy(() => import("./playground/ComponentPage"));
const PackPage = lazy(() => import("./packs/PackPage"));

function Header() {
  return (
    <div className="site-header">
      <div className="wrap">
        <a className="brand" href="#/">
          lm<b>thing</b>/ui
        </a>
        <nav className="nav" aria-label="Sections">
          <a href="#/">Home</a>
          <a href="#llm">LLMs</a>
          <a href="#try">Try it</a>
          <a href="#packs">Packs</a>
          <a href="#components">Components</a>
          <a href="#themes">Themes</a>
          <a href="gallery/">Gallery</a>
          <a href={`https://github.com/${site.repo}`}>GitHub</a>
        </nav>
        <ThemeSwitcher />
      </div>
    </div>
  );
}

export function App() {
  const route = useRoute();
  return (
    <ThemeProvider>
      <Header />
      {route.name === "home" && <Landing />}
      {route.name === "component" && <Lazy view={ComponentPage} id={route.id} />}
      {route.name === "pack" && <Lazy view={PackPage} id={route.id} />}
      <footer className="site-footer">
        <div className="wrap">
          Built {site.built} from{" "}
          <a href={`https://github.com/${site.repo}/commit/${site.commit}`}>{site.commit}</a>. Everything on
          this page is read from the repo at build time.
        </div>
      </footer>
    </ThemeProvider>
  );
}
