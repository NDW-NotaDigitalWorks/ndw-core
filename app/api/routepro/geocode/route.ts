// app/api/routepro/geocode/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const ORS_BASE = "https://api.openrouteservice.org";

function makeTraceId() {
  return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function pickEnvOrsKey(): string | null {
  const k = process.env.ORS_API_KEY?.trim();
  return k ? k : null;
}

async function fetchJsonSafe(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number; json: any | null; text: string }> {
  const res = await fetch(url, init);
  const status = res.status;
  const text = await res.text().catch(() => "");
  let json: any | null = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { ok: res.ok, status, json, text };
}

async function orsGeocodeSoft(apiKey: string, address: string): Promise<{ lat: number; lng: number } | null> {
  const url = new URL(`${ORS_BASE}/geocode/search`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("text", address);
  url.searchParams.set("size", "1");
  url.searchParams.set("layers", "address,venue,locality,street");

  const { ok, status, json } = await fetchJsonSafe(url.toString(), { method: "GET" });
  if (!ok) {
    // 429 / 5xx gestiti dal chiamante (backoff)
    return null;
  }

  const coords = json?.features?.[0]?.geometry?.coordinates; // [lng, lat]
  if (!coords || coords.length < 2) return null;

  const lng = Number(coords[0]);
  const lat = Number(coords[1]);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

  return { lat, lng };
}

async function nominatimGeocodeSoft(q: string): Promise<{ lat: number; lng: number } | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("q", q);

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent": "NDW-RoutePro/1.0 (notadigitalworks.com)",
      "Accept-Language": "it-IT,it;q=0.9,en;q=0.8",
    },
  });

  if (!res.ok) return null;

  const data = (await res.json().catch(() => null)) as any[] | null;
  if (!Array.isArray(data) || data.length === 0) return null;

  const lat = Number(data[0]?.lat);
  const lng = Number(data[0]?.lon);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

  return { lat, lng };
}

export async function POST(req: Request) {
  const traceId = makeTraceId();

  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return NextResponse.json({ error: "Unauthorized", traceId }, { status: 401 });

    const body = await req.json().catch(() => null);
    const routeId = body?.routeId;
    if (typeof routeId !== "string" || routeId.length < 8) {
      return NextResponse.json({ error: "routeId missing/invalid", traceId }, { status: 400 });
    }

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return NextResponse.json({ error: "Server misconfigured (missing env)", traceId }, { status: 500 });
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
      return NextResponse.json({ error: "Route not found", traceId }, { status: 404 });
    }
    if (routeRow.user_id !== userId) {
      return NextResponse.json({ error: "Forbidden", traceId }, { status: 403 });
    }

    // ORS key: user -> env
    const { data: settingsRow } = await admin
      .from("routepro_settings")
      .select("ors_api_key")
      .eq("user_id", userId)
      .maybeSingle();

    const userKey = settingsRow?.ors_api_key?.trim() || null;
    const envKey = pickEnvOrsKey();
    const keyMode: "user" | "ndw" | "none" = userKey ? "user" : envKey ? "ndw" : "none";

    // prendi stop senza coords (25 per batch)
    // IMPORTANT: gestiamo sia lat null che lng null
    const { data: stops, error: stopsErr } = await admin
      .from("route_stops")
      .select("id,address,lat,lng")
      .eq("route_id", routeId)
      .or("lat.is.null,lng.is.null")
      .limit(25);

    if (stopsErr) {
      return NextResponse.json({ error: "Stops query failed", traceId }, { status: 500 });
    }

    if (!stops || stops.length === 0) {
      return NextResponse.json({ ok: true, updated: 0, attempted: 0, keyMode, message: "Nothing to geocode", traceId });
    }

    let updated = 0;
    let orsRateLimited = false;

    const failures: Array<{ id: string; address: string; reason: string }> = [];

    // throttle
    const ORS_DELAY_MS = 350;
    const NOMINATIM_DELAY_MS = 1100;

    // backoff in caso di 429/5xx “ripetuti”
    let orsBackoffMs = 0;

    for (const s of stops as any[]) {
      const addr = String(s.address || "").trim();
      if (!addr) {
        failures.push({ id: s.id, address: "", reason: "empty_address" });
        continue;
      }

      let coords: { lat: number; lng: number } | null = null;

      // 1) ORS user key
      if (userKey && !coords) {
        if (orsBackoffMs > 0) await sleep(orsBackoffMs);
        coords = await orsGeocodeSoft(userKey, addr);
        await sleep(ORS_DELAY_MS);
      }

      // 2) ORS env key
      if (!coords && envKey) {
        if (orsBackoffMs > 0) await sleep(orsBackoffMs);
        coords = await orsGeocodeSoft(envKey, addr);
        await sleep(ORS_DELAY_MS);
      }

      // Se ORS non trova, può essere “no match” oppure “rate limit”.
      // Per distinguere senza rifare chiamate: quando vedi tanti null di fila, trattiamo come potenziale rate-limit
      // e aumentiamo leggermente il backoff (senza impazzire).
      if (!coords && (userKey || envKey)) {
        orsBackoffMs = Math.min(2000, orsBackoffMs + 250);
        if (orsBackoffMs >= 1000) orsRateLimited = true;
      } else {
        orsBackoffMs = 0;
      }

      // 3) fallback Nominatim (gentle)
      if (!coords) {
        coords = await nominatimGeocodeSoft(addr);
        await sleep(NOMINATIM_DELAY_MS);
      }

      if (!coords) {
        failures.push({
          id: s.id,
          address: addr,
          reason: keyMode === "none" ? "no_key_and_no_match" : "no_match",
        });
        continue;
      }

      const { error: upErr } = await admin
        .from("route_stops")
        .update({ lat: coords.lat, lng: coords.lng })
        .eq("id", s.id);

      if (!upErr) updated++;
      else failures.push({ id: s.id, address: addr, reason: "db_update_failed" });
    }

    const warnings: string[] = [];
    if (orsRateLimited) warnings.push("ORS rate-limit detected (slowdown/backoff applied). Consider user ORS key for heavy usage.");

    return NextResponse.json({
      ok: true,
      updated,
      attempted: stops.length,
      keyMode,
      rateLimited: orsRateLimited,
      warnings,
      failures: failures.slice(0, 8),
      traceId,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Geocode failed", detail: e?.message ?? String(e), traceId },
      { status: 500 }
    );
  }
}
