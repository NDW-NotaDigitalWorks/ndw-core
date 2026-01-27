// lib/routepro/plan.ts
import { supabase } from "@/lib/supabaseClient";

export type NDWPlan = "starter" | "pro" | "elite";

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

/**
 * Plan resolution rules:
 * 1) Admin/CEO email -> elite
 * 2) Whop entitlements -> elite/pro/starter
 * 3) Trial PRO (if active) -> pro
 * 4) Default -> starter (but RoutePro access still requires entitlement starter/pro/elite)
 */
export async function getPlan(): Promise<NDWPlan> {
  const { data: userData } = await supabase.auth.getUser();
  const email = userData.user?.email?.toLowerCase() ?? null;

  if (email && ADMIN_EMAILS.includes(email)) return "elite";

  // 1) check Whop-based entitlements (stored in entitlements table)
  // We treat routepro_elite > routepro_pro > routepro_starter
  const { data: ent, error } = await supabase
    .from("entitlements")
    .select("product_code,status")
    .eq("status", "active")
    .in("product_code", ["routepro_elite", "routepro_pro", "routepro_starter"]);

  if (!error && ent?.length) {
    const codes = ent.map((e: any) => e.product_code);
    if (codes.includes("routepro_elite")) return "elite";
    if (codes.includes("routepro_pro")) return "pro";
    if (codes.includes("routepro_starter")) return "starter";
  }

  // 2) Trial PRO internal
  const { data: trial } = await supabase
    .from("routepro_trial")
    .select("trial_expires_at")
    .maybeSingle();

  if (trial?.trial_expires_at) {
    const exp = new Date(trial.trial_expires_at).getTime();
    if (Date.now() < exp) return "pro";
  }

  return "starter";
}

export async function hasRouteProAccess(): Promise<boolean> {
  // RoutePro access requires at least starter entitlement
  const { data, error } = await supabase
    .from("entitlements")
    .select("id")
    .eq("status", "active")
    .in("product_code", ["routepro_starter", "routepro_pro", "routepro_elite"])
    .limit(1)
    .maybeSingle();

  return !error && !!data;
}
