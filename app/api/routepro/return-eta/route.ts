// app/api/routepro/return-eta/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const ORS_BASE = "https://api.openrouteservice.org";

function makeTraceId() {
  return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}

function mustOrsFallback(): string {
  const key = process.env.ORS_API_KEY?.trim();
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

async function orsGeocodeSoft(apiKey: string, address: string): Promise<{ lng: number; lat: number } | null> {
  const url = new URL(`${ORS_BASE}/geocode/search`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("text", address);
  url.searchParams.set("size", "1");

  const res = await fetch(url.toString(), { method: "GET" });
  if (!res.ok) return null;

  const data = (await res.json().catch(() => null)) as any;
  const coords = data?.features?.[0]?.geometry?.coordinates; // [lng, lat]
  if (!coords || coords.length < 2) return null;

  const lng = Number(coords[0]);
  const lat = Number(coords[1]);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

  return { lng, lat };
}

async function orsDirectionsMinutes(
  apiKey: string,
  start: { lat: number; lng: number },
  end: { lat: number; lng: number }
) {
  const url = `${ORS_BASE}/v2/directions/driving-car?start=${start.lng},${start.lat}&end=${end.lng},${end.lat}`;
  const res = await fetch(url, { method: "GET", headers: { Authorization: apiKey } });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`ORS directions failed: ${res.status} ${txt}`);
  }

  const data = (await res.json().catch(() => null)) as any;
  const seconds = data?.features?.[0]?.properties?.summary?.duration;
  if (typeof seconds !== "number") throw new Error("Missing duration from ORS directions response.");
  return Math.round(seconds / 60);
}

export async function POST(req: NextRequest) {
  const traceId = makeTraceId();

  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    const body = await req.json().catch(() => null);
    const from = body?.from;
    const to = body?.to;

    if (!from || !to) return NextResponse.json({ error: "Missing from/to", traceId }, { status: 400 });

    const userKey = await getUserOrsKeyFromToken(token);
    const apiKey = userKey ?? mustOrsFallback();

    async function resolvePoint(p: any): Promise<{ lat: number; lng: number }> {
      if (typeof p?.lat === "number" && typeof p?.lng === "number") return { lat: p.lat, lng: p.lng };

      if (typeof p?.address === "string" && p.address.trim()) {
        const geo = await orsGeocodeSoft(apiKey, p.address);
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
      traceId,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error", traceId }, { status: 500 });
  }
}
