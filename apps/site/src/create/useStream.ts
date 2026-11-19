import { useEffect, useState } from "react";

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/** How many lines have arrived: one more every `every` ms, restarting when `key` changes or `run` bumps. */
export function useStream(total: number, key: string, run: number, every = 950) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (reduced()) return setCount(total);
    setCount(0);
    const timer = setInterval(() => setCount((n) => (n >= total ? n : n + 1)), every);
    return () => clearInterval(timer);
  }, [total, key, run, every]);
  return count;
}
