// src/lib/routepro/routeProPath.ts
export function routeProPath(path: string) {
  const p = path.startsWith("/") ? path : `/${path}`;

  // Server-side: assumiamo path classico /routepro/*
  if (typeof window === "undefined") return `/routepro${p}`;

  const host = window.location.hostname.toLowerCase();
  const onSubdomain = host.startsWith("routepro.");

  // Se siamo su routepro.notadigitalworks.com -> niente prefisso
  return onSubdomain ? p : `/routepro${p}`;
}
