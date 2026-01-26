// app/api/routepro/optimize/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type StopIn = {
  id: string;
  address: string;
  lat: number | null;
  lng: number | null;
};

type BodyIn = {
  stops: StopIn[];
};

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

  const { data: row, error: dbErr } = await supabaseAdmin
    .from("routepro_settings")
    .select("ors_api_key")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (dbErr) return null;
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

async function orsOptimize(apiKey: string, stops: { id: string; lat: number; lng: number }[]) {
  const jobs = stops.map((s, idx) => ({
    id: idx + 1,
    location: [s.lng, s.lat],
  }));

  const body = {
    jobs,
    vehicles: [
      {
        id: 1,
        profile: "driving-car",
        start: jobs[0]?.location ?? [0, 0],
        end: jobs[0]?.location ?? [0, 0],
      },
    ],
  };

  const res = await fetch(`${ORS_BASE}/optimization`, {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`ORS optimize failed: ${res.status} ${txt}`);
  }

  const data = await res.json();
  const steps = data?.routes?.[0]?.steps ?? [];
  const jobOrder: number[] = steps
    .filter((s: any) => s?.type === "job")
    .map((s: any) => s?.job)
    .filter((n: any) => typeof n === "number");

  const stopIndexes = jobOrder.map((jobId) => jobId - 1);
  return stopIndexes;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as BodyIn;
    const stops = body?.stops ?? [];

    if (!Array.isArray(stops) || stops.length < 2) {
      return NextResponse.json(
        { error: "Serve almeno 2 stop per ottimizzare." },
        { status: 400 }
      );
    }

    // Read Supabase token if provided by client
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    // Prefer user key if present, else fallback NDW key
    const userKey = await getUserOrsKeyFromToken(token);
    const apiKey = userKey ?? mustOrsFallback();

    // Ensure coords: geocode missing
    const withCoords: StopIn[] = [];
    for (const s of stops) {
      if (typeof s.address !== "string" || !s.address.trim()) {
        return NextResponse.json({ error: "Stop senza address valido." }, { status: 400 });
      }

      if (s.lat != null && s.lng != null) {
        withCoords.push(s);
        continue;
      }

      const geo = await orsGeocode(apiKey, s.address);
      if (!geo) {
        return NextResponse.json(
          { error: `Geocoding fallito per: ${s.address}` },
          { status: 400 }
        );
      }

      withCoords.push({ ...s, lat: geo.lat, lng: geo.lng });
    }

    const mapped = withCoords.map((s) => ({
      id: s.id,
      lat: s.lat as number,
      lng: s.lng as number,
    }));

    const optimizedIndexes = await orsOptimize(apiKey, mapped);
    const optimizedStopIds = optimizedIndexes.map((i) => mapped[i].id);

    return NextResponse.json({
      optimizedStopIds,
      stopsWithCoords: withCoords.map((s) => ({ id: s.id, lat: s.lat, lng: s.lng })),
      algorithm: userKey ? "ors-user-key" : "ors-ndw-key",
      keyMode: userKey ? "user" : "ndw",
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Optimize error" },
      { status: 500 }
    );
  }
}
