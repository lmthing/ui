import { lazyChunk } from "./shared/lazyChunk";
import { Landing } from "./landing/Landing";
import { useHashScroll, useRoute } from "./router";
import { Footer } from "./shell/Footer";
import { Header } from "./shell/Header";
import { RouteBoundary } from "./shell/RouteBoundary";
import { NotFound } from "./shell/NotFound";
import { Lazy } from "./shared/Lazy";
import { useAlternate } from "./shared/useAlternate";
import { PageSkeleton } from "./shell/PageSkeleton";
import { ThemeProvider } from "./theme/ThemeContext";

const ComponentPage = lazyChunk(() => import("./playground/ComponentPage"));
const ComponentsPage = lazyChunk(() => import("./index/ComponentsPage"));
const PackPage = lazyChunk(() => import("./packs/PackPage"));

export function App() {
  const route = useRoute();
  useHashScroll(route.name);
  useAlternate(route);
  return (
    <ThemeProvider>
      <Header />
      <RouteBoundary route={JSON.stringify(route)}>
        {route.name === "home" && <Landing />}
        {route.name === "components" && (
          <Lazy view={ComponentsPage} fallback={<PageSkeleton what="components" />} />
        )}
        {route.name === "component" && (
          <Lazy
            key={route.id}
            view={ComponentPage}
            id={route.id}
            fallback={<PageSkeleton what={route.id} />}
          />
        )}
        {route.name === "missing" && <NotFound what={`page at ${route.path}`} />}
        {route.name === "pack" && (
          <Lazy view={PackPage} id={route.id} fallback={<PageSkeleton what={`${route.id} pack`} />} />
        )}
      </RouteBoundary>
      <Footer />
    </ThemeProvider>
  );
}
