// app/api/routepro/geocode/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function makeTraceId() {
  return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function nominatimGeocode(q: string): Promise<{ lat: number; lng: number } | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("q", q);

  const res = await fetch(url.toString(), {
    headers: {
      // IMPORTANT: Nominatim richiede un User-Agent identificabile
      "User-Agent": "NDW-RoutePro/1.0 (notadigitalworks.com)",
      "Accept-Language": "it-IT,it;q=0.9,en;q=0.8",
    },
  });

  if (!res.ok) return null;
  const data = (await res.json()) as any[];
  if (!Array.isArray(data) || data.length === 0) return null;

  const lat = Number(data[0].lat);
  const lng = Number(data[0].lon);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

  return { lat, lng };
}

export async function POST(req: Request) {
  const traceId = makeTraceId();

  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized", traceId }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const routeId = body?.routeId;
    if (typeof routeId !== "string" || routeId.length < 8) {
      return NextResponse.json({ error: "routeId missing/invalid", traceId }, { status: 400 });
    }

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return NextResponse.json(
        { error: "Server misconfigured (missing env)", traceId },
        { status: 500 }
      );
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

    // valida utente dal token
    const { data: userRes, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userRes?.user) {
      return NextResponse.json({ error: "Unauthorized", detail: userErr?.message, traceId }, { status: 401 });
    }
    const userId = userRes.user.id;

    // verifica ownership rotta
    const { data: routeRow, error: routeErr } = await admin
      .from("routes")
      .select("id,user_id")
      .eq("id", routeId)
      .maybeSingle();

    if (routeErr || !routeRow) {
      return NextResponse.json({ error: "Route not found", detail: routeErr, traceId }, { status: 404 });
    }
    if (routeRow.user_id !== userId) {
      return NextResponse.json({ error: "Forbidden", traceId }, { status: 403 });
    }

    // prendi stop senza coords (limite 25 per chiamata)
    const { data: stops, error: stopsErr } = await admin
      .from("route_stops")
      .select("id,address,lat,lng")
      .eq("route_id", routeId)
      .is("lat", null)
      .limit(25);

    if (stopsErr) {
      return NextResponse.json({ error: "Stops query failed", detail: stopsErr, traceId }, { status: 500 });
    }

    if (!stops || stops.length === 0) {
      return NextResponse.json({ ok: true, updated: 0, message: "Nothing to geocode", traceId });
    }

    let updated = 0;
    const failures: Array<{ id: string; address: string }> = [];

    for (const s of stops as any[]) {
      const addr = String(s.address || "").trim();
      if (!addr) {
        failures.push({ id: s.id, address: "" });
        continue;
      }

      const result = await nominatimGeocode(addr);
      if (!result) {
        failures.push({ id: s.id, address: addr });
        await sleep(1000);
        continue;
      }

      const { error: upErr } = await admin
        .from("route_stops")
        .update({ lat: result.lat, lng: result.lng })
        .eq("id", s.id);

      if (!upErr) updated++;
      else failures.push({ id: s.id, address: addr });

      // throttle 1 req/sec
      await sleep(1000);
    }

    return NextResponse.json({
      ok: true,
      updated,
      attempted: stops.length,
      failures: failures.slice(0, 5),
      traceId,
    });
  } catch (e: any) {
    return NextResponse.json({ error: "Geocode failed", detail: e?.message ?? e, traceId }, { status: 500 });
  }
}
