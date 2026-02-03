// components/AutoUpdate.tsx
"use client";

import { useEffect } from "react";

const KEY = "ndw_build_version";

async function fetchVersion(): Promise<string | null> {
  try {
    const res = await fetch("/api/version", { cache: "no-store" });
    const data = await res.json();
    return typeof data?.version === "string" ? data.version : null;
  } catch {
    return null;
  }
}

export function AutoUpdate() {
  useEffect(() => {
    let mounted = true;

    async function check() {
      const v = await fetchVersion();
      if (!mounted || !v) return;

      const prev = localStorage.getItem(KEY);
      if (!prev) {
        localStorage.setItem(KEY, v);
        return;
      }

      if (prev !== v) {
        // Nuova build disponibile → ricarica per prendere asset nuovi
        localStorage.setItem(KEY, v);
        window.location.reload();
      }
    }

    // check subito
    check();

    // check quando torni in app (es. da navigazione esterna)
    const onFocus = () => check();
    window.addEventListener("focus", onFocus);

    // check periodico leggero (ogni 30s)
    const t = setInterval(check, 30_000);

    return () => {
      mounted = false;
      clearInterval(t);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return null;
}
