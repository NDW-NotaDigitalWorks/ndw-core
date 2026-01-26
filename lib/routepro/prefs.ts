// lib/routepro/prefs.ts
export function setLastRouteId(routeId: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("ndw_routepro_last_route_id", routeId);
}

export function getLastRouteId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ndw_routepro_last_route_id");
}

export function setDriverView(routeId: string, view: "list" | "map") {
  if (typeof window === "undefined") return;
  localStorage.setItem(`ndw_routepro_driver_view_${routeId}`, view);
}

export function getDriverView(routeId: string): "list" | "map" {
  if (typeof window === "undefined") return "list";
  const v = localStorage.getItem(`ndw_routepro_driver_view_${routeId}`);
  return v === "map" ? "map" : "list";
}
