// lib/routepro/navigation.ts

export type NavApp = "google" | "waze";

function getPref(): NavApp {
  // Local preference (later we’ll store in profiles/settings)
  const v = (typeof window !== "undefined" && localStorage.getItem("ndw_nav_app")) || "google";
  return v === "waze" ? "waze" : "google";
}

export function setNavPref(app: NavApp) {
  if (typeof window === "undefined") return;
  localStorage.setItem("ndw_nav_app", app);
}

export function openNavigation({
  lat,
  lng,
  address,
}: {
  lat?: number | null;
  lng?: number | null;
  address: string;
}) {
  const app = getPref();

  const hasCoords = !!lat && !!lng;

  const googleUrl = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;

  // Waze deep link
  const wazeUrl = hasCoords
    ? `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`
    : `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`;

  if (app === "waze") {
    // open waze link, fallback to google after a short delay
    const start = Date.now();
    window.location.href = wazeUrl;

    // fallback only for browsers that stay on page (no app)
    setTimeout(() => {
      const elapsed = Date.now() - start;
      // if user is still here after ~1.2s, open Google
      if (elapsed >= 1100) window.open(googleUrl, "_blank");
    }, 1200);

    return;
  }

  window.open(googleUrl, "_blank");
}
