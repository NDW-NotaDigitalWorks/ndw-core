// lib/entitlement.ts
import { supabase } from "@/lib/supabaseClient";

export type RouteProTier = "starter" | "pro" | "elite";

export async function hasRouteProAccess(): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return false;

  const { data, error } = await supabase
    .from("entitlements")
    .select("product_code")
    .eq("user_id", userData.user.id)
    .eq("status", "active")
    .in("product_code", ["routepro_starter", "routepro_pro", "routepro_elite"])
    .limit(1)
    .maybeSingle();

  if (error) return false;
  return !!data;
}

async function getTrialIsActive(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("routepro_trial")
    .select("trial_expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data?.trial_expires_at) return false;
  return Date.now() < new Date(data.trial_expires_at).getTime();
}

export async function getRouteProTier(): Promise<RouteProTier | null> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const userId = userData.user.id;

  const { data, error } = await supabase
    .from("entitlements")
    .select("product_code")
    .eq("user_id", userId)
    .eq("status", "active")
    .in("product_code", ["routepro_starter", "routepro_pro", "routepro_elite"]);

  if (error || !data?.length) return null;

  const codes = data.map((x: any) => x.product_code);
  if (codes.includes("routepro_elite")) return "elite";
  if (codes.includes("routepro_pro")) return "pro";

  // If starter, check trial
  const trialActive = await getTrialIsActive(userId);
  if (trialActive) return "pro";

  return "starter";
}
