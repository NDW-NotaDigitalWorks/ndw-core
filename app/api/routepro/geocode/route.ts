// app/api/routepro/geocode/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function sb() {
  return createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function geocodeNominatim(q: string): Promise<{ lat: number; lng: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;

  const res = await fetch(url, {
    headers: {
      // Nominatim vuole uno user-agent identificabile
      "User-Agent": "NDW-RoutePro/1.0 (notadigitalworks.com)",
      "Accept": "application/json",
    },
    // cache zero per risultati freschi
    cache: "no-store",
  });

  if (!res.ok) return null;
  const data = (await res.json()) as any[];
  if (!data?.length) return null;

  const lat = Number(data[0].lat);
  const lng = Number(data[0].lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return { lat, lng };
}

export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const routeId = String(body?.routeId || "");
    if (!routeId) return NextResponse.json({ error: "Missing routeId" }, { status: 400 });

    const supabase = sb();

    // verify user
    const { data: uData, error: uErr } = await supabase.auth.getUser(token);
    if (uErr || !uData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = uData.user.id;

    // verify route ownership
    const { data: routeRow, error: rErr } = await supabase
      .from("routes")
      .select("id,user_id")
      .eq("id", routeId)
      .single();

    if (rErr || !routeRow) return NextResponse.json({ error: "Route not found" }, { status: 404 });
    if (routeRow.user_id !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // load stops missing coords (max 6 each call)
    const { data: stops, error: sErr } = await supabase
      .from("route_stops")
      .select("id,address,lat,lng")
      .eq("route_id", routeId)
      .is("lat", null)
      .is("lng", null)
      .limit(6);

    if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

    if (!stops || stops.length === 0) {
      return NextResponse.json({ updated: 0, remaining: 0 });
    }

    let updated = 0;

    for (const st of stops) {
      const q = String(st.address || "").trim();
      if (!q) continue;

      const coords = await geocodeNominatim(q);
      if (!coords) continue;

      const { error: upErr } = await supabase
        .from("route_stops")
        .update({ lat: coords.lat, lng: coords.lng })
        .eq("id", st.id);

      if (!upErr) updated++;
    }

    // check remaining
    const { count } = await supabase
      .from("route_stops")
      .select("*", { count: "exact", head: true })
      .eq("route_id", routeId)
      .is("lat", null)
      .is("lng", null);

    return NextResponse.json({ updated, remaining: count ?? null });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Geocode error" }, { status: 500 });
  }
}
