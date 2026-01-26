// lib/routeproRepository.ts
import { supabase } from "@/lib/supabaseClient";

export type CreateRouteInput = {
  name?: string;
  routeDate?: string; // YYYY-MM-DD
};

export type StopType = "pickup" | "delivery" | "return";

export type ImportStopInput = {
  address: string;
  note?: string;
  lat?: number | null;
  lng?: number | null;

  // Flex additions
  stopType?: StopType;
  afStopNumber?: number | null; // Amazon Flex numbering
};

/**
 * Creates a new route (draft) for the current user and imports stops.
 */
export async function createRouteWithStops(
  route: CreateRouteInput,
  stops: ImportStopInput[]
): Promise<{ routeId: string }> {
  if (!stops.length) throw new Error("Nessuno stop da importare.");

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  if (!userData.user) throw new Error("Non autenticato.");

  const routeName = (route.name ?? "Untitled route").trim() || "Untitled route";

  const { data: routeRow, error: routeErr } = await supabase
    .from("routes")
    .insert({
      user_id: userData.user.id,
      name: routeName,
      route_date: route.routeDate ?? null,
      status: "draft",
      total_stops: stops.length,
    })
    .select("id")
    .single();

  if (routeErr) throw routeErr;
  if (!routeRow?.id) throw new Error("Creazione rotta fallita.");

  const rows = stops.map((s, idx) => ({
    route_id: routeRow.id,
    position: idx + 1, // ordine di input
    optimized_position: null,
    address: s.address.trim(),
    note: s.note?.trim() || null,
    lat: s.lat ?? null,
    lng: s.lng ?? null,

    stop_type: s.stopType ?? "delivery",
    af_stop_number: s.afStopNumber ?? (idx + 1),
    is_done: false,
  }));

  const { error: stopsErr } = await supabase.from("route_stops").insert(rows);
  if (stopsErr) throw stopsErr;

  return { routeId: routeRow.id };
}

/**
 * Parse "1 address per line" input into stops.
 */
export function parseStopsFromText(input: string): ImportStopInput[] {
  return input
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((address) => ({ address }));
}
