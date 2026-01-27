// app/manifest.ts
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NDW — Nota Digital Works",
    short_name: "NDW",
    description: "NDW Core + RoutePro",
    start_url: "/",
    display: "standalone",
    background_color: "#050B1E",
    theme_color: "#050B1E",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
