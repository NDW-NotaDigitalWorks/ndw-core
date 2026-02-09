import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ParsedStop = {
  stop_type: "pickup" | "delivery" | "return";
  position: number;
  address: string;
  packages: number | null;
  af_stop_number: number | null;
};

function parseStopsFromRawText(rawText: string): ParsedStop[] {
  const text = rawText.replace(/\r/g, "").trim();
  const blocks = text.split(/\n{2,}/g).map((b) => b.trim()).filter(Boolean);

  let position = 1;

  const stops: ParsedStop[] = blocks.map((block) => {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);

    // prova a leggere AF stop number tipo: "N. C22-2G • Consegna ..."
    let af_stop_number: number | null = null;
    const first = lines[0] ?? "";
    const mAf = first.match(/N\.\s*(\d+)/i);
    if (mAf) af_stop_number = Number(mAf[1]) || null;

    // packages: "Consegna 4 pacchi" / "Ritiro 48 colli"
    let packages: number | null = null;
    const packLine = lines.find((l) => /pacc|colli/i.test(l));
    if (packLine) {
      const mPack = packLine.match(/(\d+)/);
      if (mPack) packages = Number(mPack[1]) || null;
    }

    // stop_type: euristica (puoi raffinarla dopo)
    let stop_type: "pickup" | "delivery" | "return" = "delivery";
    const low = block.toLowerCase();
    if (low.includes("ritiro")) stop_type = "pickup";
    if (low.includes("rientro") || low.includes("return")) stop_type = "return";

    // address: prendo le righe “utili” saltando header tipo "N. ... • Consegna ..."
    const addrLines = lines.slice(1); // tolgo la prima riga
    const address = addrLines.join(", ").trim() || lines.join(", ");

    const out: ParsedStop = {
      stop_type,
      position,
      address,
      packages,
      af_stop_number,
    };

    position += 1;
    return out;
  });

  return stops.filter((s) => s.address.length >= 5);
}

function getBearerToken(req: Request): string | null {
  const h = req.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

export async function POST(req: Request) {
  try {
    const { rawText } = (await req.json()) as { rawText?: string };
    if (!rawText || rawText.trim().length < 10) {
      return NextResponse.json({ error: "rawText mancante" }, { status: 400 });
    }

    // ✅ verifica utente via JWT Supabase (passato dal client)
    const token = getBearerToken(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // client Supabase "user-scoped"
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: userRes, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !userRes.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = userRes.user.id;

    // ✅ parse testo -> stops
    const stops = parseStopsFromRawText(rawText);
    if (stops.length === 0) {
      return NextResponse.json({ error: "Nessuno stop riconosciuto" }, { status: 400 });
    }

    // ⚠️ ASSUNZIONE TABELLE (probabile nel tuo progetto RoutePro):
    // - route_routes: tabella rotte (id, user_id, title, created_at...)
    // - route_stops: tabella stops (route_id, position, stop_type, address, packages, lat, lng, is_done, af_stop_number...)
    //
    // Se i nomi nel DB sono diversi, ti dico subito dove cambiare sotto.

    // 1) crea rotta
    const title = `Import ${new Date().toLocaleDateString("it-IT")}`;

    const { data: routeRow, error: routeErr } = await supabaseUser
      .from("route_routes")
      .insert({ user_id: userId, title })
      .select("id")
      .single();

    if (routeErr || !routeRow?.id) {
      // fallback: prova con tabella "routes" se nel tuo schema è così
      const fallback = await supabaseUser
        .from("routes")
        .insert({ user_id: userId, title })
        .select("id")
        .single();

      if (fallback.error || !fallback.data?.id) {
        return NextResponse.json(
          { error: `Errore creazione rotta. Controlla nome tabella rotte (route_routes / routes).` },
          { status: 500 }
        );
      }

      const routeId = fallback.data.id as string;

      // 2) inserisci stops
      const payloadStops = stops.map((s) => ({
        route_id: routeId,
        position: s.position,
        stop_type: s.stop_type,
        address: s.address,
        packages: s.packages,
        af_stop_number: s.af_stop_number,
        lat: null,
        lng: null,
        is_done: false,
        optimized_position: null,
      }));

      const { error: stopsErr } = await supabaseUser.from("route_stops").insert(payloadStops);
      if (stopsErr) {
        return NextResponse.json({ error: "Errore insert stops" }, { status: 500 });
      }

      return NextResponse.json({ routeId });
    }

    const routeId = routeRow.id as string;

    // 2) inserisci stops
    const payloadStops = stops.map((s) => ({
      route_id: routeId,
      position: s.position,
      stop_type: s.stop_type,
      address: s.address,
      packages: s.packages,
      af_stop_number: s.af_stop_number,
      lat: null,
      lng: null,
      is_done: false,
      optimized_position: null,
    }));

    const { error: stopsErr } = await supabaseUser.from("route_stops").insert(payloadStops);
    if (stopsErr) {
      return NextResponse.json({ error: "Errore insert stops" }, { status: 500 });
    }

    return NextResponse.json({ routeId });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Errore" }, { status: 500 });
  }
}
