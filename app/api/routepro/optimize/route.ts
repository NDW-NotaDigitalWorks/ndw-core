// app/api/routepro/optimize/route.ts
import { NextResponse } from "next/server";

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

function getOrsKey(): string {
  const key = process.env.ORS_API_KEY;
  if (!key) throw new Error("Missing ORS_API_KEY in environment.");
  return key;
}

async function orsGeocode(address: string) {
  const key = getOrsKey();
  const url = new URL(`${ORS_BASE}/geocode/search`);
  url.searchParams.set("api_key", key);
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

async function orsOptimize(stops: { id: string; lat: number; lng: number }[]) {
  const key = getOrsKey();

  // ORS optimization expects "jobs" and one "vehicle"
  const jobs = stops.map((s, idx) => ({
    id: idx + 1, // ORS requires numeric ids; we map back later by index
    location: [s.lng, s.lat], // [lng, lat]
  }));

  const body = {
    jobs,
    vehicles: [
      {
        id: 1,
        profile: "driving-car",
        start: jobs[0]?.location ?? [0, 0], // fallback (will be overridden by input size check)
        end: jobs[0]?.location ?? [0, 0],
      },
    ],
  };

  // IMPORTANT: ORS optimization endpoint
  const res = await fetch(`${ORS_BASE}/optimization`, {
    method: "POST",
    headers: {
      Authorization: key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`ORS optimize failed: ${res.status} ${txt}`);
  }

  const data = await res.json();

  // ORS returns routes[0].steps with job ids in order (type: "job")
  const steps = data?.routes?.[0]?.steps ?? [];
  const jobOrder: number[] = steps
    .filter((s: any) => s?.type === "job")
    .map((s: any) => s?.job)
    .filter((n: any) => typeof n === "number");

  // jobOrder contains numeric job ids we assigned: 1..N (same order as stops array)
  // We convert to stop index order: 0..N-1
  const stopIndexes = jobOrder.map((jobId) => jobId - 1);

  return stopIndexes;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as BodyIn;
    const stops = body?.stops ?? [];

    if (!Array.isArray(stops) || stops.length < 2) {
      return NextResponse.json(
        { error: "Serve almeno 2 stop per ottimizzare." },
        { status: 400 }
      );
    }

    // 1) Ensure coords: geocode missing
    const withCoords: StopIn[] = [];
    for (const s of stops) {
      if (typeof s.address !== "string" || !s.address.trim()) {
        return NextResponse.json(
          { error: "Stop senza address valido." },
          { status: 400 }
        );
      }

      if (s.lat != null && s.lng != null) {
        withCoords.push(s);
        continue;
      }

      const geo = await orsGeocode(s.address);
      if (!geo) {
        return NextResponse.json(
          { error: `Geocoding fallito per: ${s.address}` },
          { status: 400 }
        );
      }

      withCoords.push({ ...s, lat: geo.lat, lng: geo.lng });
    }

    // 2) Optimize order
    const mapped = withCoords.map((s) => ({
      id: s.id,
      lat: s.lat as number,
      lng: s.lng as number,
    }));

    const optimizedIndexes = await orsOptimize(mapped);

    // 3) Convert order to stop ids
    const optimizedStopIds = optimizedIndexes.map((i) => mapped[i].id);

    return NextResponse.json({
      optimizedStopIds,
      stopsWithCoords: withCoords.map((s) => ({
        id: s.id,
        lat: s.lat,
        lng: s.lng,
      })),
      algorithm: "ors-optimization-v1",
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Optimize error" },
      { status: 500 }
    );
  }
}
