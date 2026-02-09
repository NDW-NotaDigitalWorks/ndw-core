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
  const blocks = text
    .split(/\n{2,}/g)
    .map((b) => b.trim())
    .filter(Boolean);

  let position = 1;

  const stops = blocks.map((block) => {
    const lines = block
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    // AF stop number (se nel testo c'è "N. 12 ...")
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

    // stop_type: euristica
    let stop_type: "pickup" | "delivery" | "return" = "delivery";
    const low = block.toLowerCase();
    if (low.includes("ritiro")) stop_type = "pickup";
    if (low.includes("rientro") || low.includes("return")) stop_type = "return";

    // address: prendo le righe dopo l'header
    const addrLines = lines.slice(1);
    const address = (addrLines.join(", ").trim() || lines.join(", ")).trim();

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

    const token = getBearerToken(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userRes.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = userRes.user.id;

    const stops = parseStopsFromRawText(rawText);
    if (stops.length === 0) {
      return NextResponse.json({ error: "Nessuno stop riconosciuto" }, { status: 400 });
    }

    // 1) crea rotta in routes
    const title = `Import ${new Date().toLocaleDateString("it-IT")}`;

    const { data: routeRow, error: routeErr } = await supabase
      .from("routes")
      .insert({ user_id: userId, title })
      .select("id")
      .single();

    if (routeErr || !routeRow?.id) {
      return NextResponse.json({ error: "Errore creazione rotta" }, { status: 500 });
    }

    const routeId = routeRow.id as string;

    // 2) inserisci stops in route_stops
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

    const { error: stopsErr } = await supabase.from("route_stops").insert(payloadStops);
    if (stopsErr) {
      return NextResponse.json({ error: "Errore insert stops" }, { status: 500 });
    }

    return NextResponse.json({ routeId });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Errore" }, { status: 500 });
  }
}
