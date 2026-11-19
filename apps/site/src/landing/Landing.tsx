import { useEffect } from "react";
import { preloadWhenIdle } from "../shared/preload";
import { Hero } from "./Hero";
import { PacksShelf } from "./PacksShelf";
import { Pipeline } from "./Pipeline";
import { Specimens } from "./Specimens";
import { ThemesSection } from "./ThemesSection";
import { TrySection } from "./TrySection";

/** Watch, try, browse: the home page tells one story in that order. */
export function Landing() {
  useEffect(preloadWhenIdle, []);
  return (
    <main id="main">
      <Hero />
      <Pipeline />
      <TrySection />
      <PacksShelf />
      <Specimens />
      <ThemesSection />
    </main>
  );
}
