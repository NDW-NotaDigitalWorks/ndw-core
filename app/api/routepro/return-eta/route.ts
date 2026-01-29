// app/api/routepro/return-eta/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const ORS_BASE = "https://api.openrouteservice.org";

function mustOrsFallback(): string {
  const key = process.env.ORS_API_KEY;
  if (!key) throw new Error("Missing ORS_API_KEY (fallback) in environment.");
  return key;
}

async function getUserOrsKeyFromToken(token: string | null): Promise<string | null> {
  if (!token) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;

  const { data: row } = await supabaseAdmin
    .from("routepro_settings")
    .select("ors_api_key")
    .eq("user_id", data.user.id)
    .maybeSingle();

  const k = row?.ors_api_key?.trim();
  return k ? k : null;
}

async function orsGeocode(apiKey: string, address: string) {
  const url = new URL(`${ORS_BASE}/geocode/search`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("text", address);
  url.searchParams.set("size", "1");

  const res = await fetch(url.toString(), { method: "GET" });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`ORS geocode failed: ${res.status} ${txt}`);
  }
  const data = await res.json();
  const feature = data?.features?.[0];
  const coords = feature?.geometry?.coordinates; // [lng, lat]
  if (!coords || coords.length < 2) return null;
  return { lng: coords[0] as number, lat: coords[1] as number };
}

async function orsDirectionsMinutes(apiKey: string, start: { lat: number; lng: number }, end: { lat: number; lng: number }) {
  // ORS Directions v2
  const url = `${ORS_BASE}/v2/directions/driving-car?start=${start.lng},${start.lat}&end=${end.lng},${end.lat}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: apiKey },
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`ORS directions failed: ${res.status} ${txt}`);
  }

  const data = await res.json();
  const seconds = data?.features?.[0]?.properties?.summary?.duration;
  if (typeof seconds !== "number") throw new Error("Missing duration from ORS directions response.");
  return Math.round(seconds / 60);
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    const body = await req.json();
    const from = body?.from; // {lat,lng} or {address}
    const to = body?.to;     // {lat,lng} or {address}

    if (!from || !to) return NextResponse.json({ error: "Missing from/to" }, { status: 400 });

    const userKey = await getUserOrsKeyFromToken(token);
    const apiKey = userKey ?? mustOrsFallback();

    // resolve coords
    async function resolvePoint(p: any): Promise<{ lat: number; lng: number }> {
      if (typeof p.lat === "number" && typeof p.lng === "number") return { lat: p.lat, lng: p.lng };
      if (typeof p.address === "string" && p.address.trim()) {
        const geo = await orsGeocode(apiKey, p.address);
        if (!geo) throw new Error(`Geocoding failed: ${p.address}`);
        return { lat: geo.lat, lng: geo.lng };
      }
      throw new Error("Invalid point (need lat/lng or address)");
    }

    const start = await resolvePoint(from);
    const end = await resolvePoint(to);

    const minutes = await orsDirectionsMinutes(apiKey, start, end);

    return NextResponse.json({
      minutes,
      keyMode: userKey ? "user" : "ndw",
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error" }, { status: 500 });
  }
}
