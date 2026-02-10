// app/api/routepro/import/text/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function makeTraceId() {
  return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}

function jsonError(status: number, error: string, detail: any, traceId: string) {
  return NextResponse.json(
    {
      error,
      detail,
      traceId,
    },
    { status }
  );
}

function normalizeLines(raw: string): string[] {
  return raw
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

function extractPackages(line: string): number | null {
  // "Consegna 3 pacchi" / "Consegna 1 pacco" / "Ritiro 48 colli"
  const m1 = line.match(/(\d+)\s*(pacchi|pacco)\b/i);
  if (m1) return Number(m1[1]);

  const m2 = line.match(/(\d+)\s*(colli)\b/i);
  if (m2) return Number(m2[1]);

  return null;
}

function isStreet(line: string) {
  return /^(via|viale|piazza|corso|largo|strada|vicolo)\b/i.test(line);
}

type ParsedStop = {
  stop_type: "pickup" | "delivery" | "return";
  af_stop_number: number | null;
  address: string;
  packages: number | null;
};

function parseFlexText(rawText: string): ParsedStop[] {
  const lines = normalizeLines(rawText);

  // Strategia semplice e robusta:
  // - Ogni "stop" lo prendiamo quando troviamo una via (street line)
  // - La riga dopo, se non è "Consegna/Ritiro/Posizione", la consideriamo città/extra
  // - Pacchi li cerchiamo in una riga che contiene "Consegna" o "Ritiro"
  // - af_stop_number lo cerchiamo in "Posizione X" o "Posizioni X"
  const stops: ParsedStop[] = [];

  let currentType: "pickup" | "delivery" | "return" = "delivery";
  let pendingStreet: string | null = null;
  let pendingCity: string | null = null;
  let pendingPackages: number | null = null;
  let pendingAf: number | null = null;

  const flush = () => {
    if (!pendingStreet) return;

    const address = pendingCity ? `${pendingStreet}, ${pendingCity}` : pendingStreet;

    stops.push({
      stop_type: currentType,
      af_stop_number: pendingAf,
      address,
      packages: pendingPackages,
    });

    pendingStreet = null;
    pendingCity = null;
    pendingPackages = null;
    pendingAf = null;
    currentType = "delivery";
  };

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];

    // Header tipo: "N. HUB-MI02 • Consegna" o "... • Ritiro"
    if (/\bRitiro\b/i.test(l)) currentType = "pickup";
    if (/\bRientro\b|\bReturn\b/i.test(l)) currentType = "return";
    if (/\bConsegna\b/i.test(l)) currentType = currentType === "pickup" ? "pickup" : "delivery";

    // "Posizione 3" / "Posizioni 2"
    const pos = l.match(/\bPosizion[ei]\s+(\d+)\b/i);
    if (pos) {
      pendingAf = Number(pos[1]);
      continue;
    }

    // pacchi/colli
    const pk = extractPackages(l);
    if (pk != null) {
      pendingPackages = pk;
      continue;
    }

    // strada
    if (isStreet(l)) {
      // se avevamo già una strada, flush prima
      if (pendingStreet) flush();
      pendingStreet = l;

      // prova a prendere "città" dalla riga successiva se sensata
      const next = lines[i + 1];
      if (next && !isStreet(next) && !/\bConsegna\b|\bRitiro\b|\bPosizion/i.test(next) && !next.startsWith("N.")) {
        pendingCity = next;
      }

      continue;
    }
  }

  flush();

  // fallback: se non abbiamo trovato niente, restituiamo vuoto
  return stops;
}

export async function POST(req: Request) {
  const traceId = makeTraceId();

  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) {
      return jsonError(401, "Unauthorized", "Missing Bearer token", traceId);
    }

    const body = await req.json().catch(() => null);
    const rawText = body?.rawText;
    if (typeof rawText !== "string" || rawText.trim().length < 10) {
      return jsonError(400, "Bad request", "rawText missing/too short", traceId);
    }

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return jsonError(
        500,
        "Server misconfigured",
        "Missing SUPABASE env vars (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)",
        traceId
      );
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    // valida utente dal token
    const { data: userRes, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userRes?.user) {
      return jsonError(401, "Unauthorized", userErr?.message ?? "Invalid token", traceId);
    }
    const userId = userRes.user.id;

    // parsing “sporco”
    const parsed = parseFlexText(rawText);

    if (parsed.length === 0) {
      return jsonError(400, "Parse failed", "Nessuno stop riconosciuto. Incolla testo più completo (via + città).", traceId);
    }

    // crea rotta (routes)
    const { data: routeRow, error: routeErr } = await admin
      .from("routes")
      .insert({ user_id: userId })
      .select("id")
      .single();

    if (routeErr || !routeRow?.id) {
      console.error("[import/text] route insert error", { traceId, routeErr });
      return jsonError(500, "Errore creazione rotta", routeErr, traceId);
    }

    const routeId = routeRow.id as string;

    // prepara stops per insert
    const stopsPayload = parsed.map((s, idx) => ({
      route_id: routeId,
      position: idx + 1,
      af_stop_number: s.af_stop_number,
      stop_type: s.stop_type,
      optimized_position: null,
      address: s.address,
      packages: s.packages,
      lat: null,
      lng: null,
      is_done: false,
    }));

    const { error: stopsErr } = await admin.from("route_stops").insert(stopsPayload);

    if (stopsErr) {
      console.error("[import/text] stops insert error", { traceId, stopsErr });

      // cleanup best-effort (evita route “vuote”)
      await admin.from("routes").delete().eq("id", routeId);

      return jsonError(500, "Errore creazione rotta", stopsErr, traceId);
    }

    return NextResponse.json({ routeId, stops: parsed.length, traceId });
  } catch (e: any) {
    console.error("[import/text] fatal", { traceId, e });
    return jsonError(500, "Errore creazione rotta", e?.message ?? e, traceId);
  }
}
