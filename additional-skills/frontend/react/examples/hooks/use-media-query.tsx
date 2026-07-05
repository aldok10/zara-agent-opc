/**
 * useMediaQuery  -  SSR-safe custom hook for responsive design.
 *
 * Returns `false` on the server, hydrates correctly on the client.
 * Listens for media query changes and re-renders when they occur.
 */
"use client";

import { useEffect, useState } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

// --- Usage ---

function ResponsiveLayout() {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  return (
    <div
      data-theme={prefersDark ? "dark" : "light"}
      data-reduced-motion={prefersReducedMotion}
    >
      {isMobile ? <MobileNav /> : <DesktopNav />}
    </div>
  );
}

// Placeholder components for the example
function MobileNav() {
  return <nav aria-label="Mobile navigation">Mobile</nav>;
}
function DesktopNav() {
  return <nav aria-label="Desktop navigation">Desktop</nav>;
}
