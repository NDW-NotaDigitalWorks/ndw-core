// app/api/routepro/trial/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: u, error: uErr } = await supabaseAdmin.auth.getUser(token);
    if (uErr || !u.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = u.user.id;

    // Must have RoutePro entitlement (starter/pro/elite) active
    const { data: ent } = await supabaseAdmin
      .from("entitlements")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "active")
      .in("product_code", ["routepro_starter", "routepro_pro", "routepro_elite"])
      .limit(1)
      .maybeSingle();

    if (!ent) {
      return NextResponse.json({ error: "No RoutePro access" }, { status: 403 });
    }

    // If already pro/elite, no need trial
    const { data: paid } = await supabaseAdmin
      .from("entitlements")
      .select("product_code")
      .eq("user_id", userId)
      .eq("status", "active")
      .in("product_code", ["routepro_pro", "routepro_elite"])
      .limit(1)
      .maybeSingle();

    if (paid) {
      return NextResponse.json({ ok: true, message: "Already Pro/Elite" });
    }

    // Upsert trial 7 days
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await supabaseAdmin.from("routepro_trial").upsert(
      { user_id: userId, trial_expires_at: expires },
      { onConflict: "user_id" }
    );

    return NextResponse.json({ ok: true, trial_expires_at: expires });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error" }, { status: 500 });
  }
}
