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

export async function getRouteProTier(): Promise<RouteProTier | null> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data, error } = await supabase
    .from("entitlements")
    .select("product_code")
    .eq("user_id", userData.user.id)
    .eq("status", "active")
    .in("product_code", ["routepro_starter", "routepro_pro", "routepro_elite"]);

  if (error || !data?.length) return null;

  const codes = data.map((x: any) => x.product_code);
  if (codes.includes("routepro_elite")) return "elite";
  if (codes.includes("routepro_pro")) return "pro";
  return "starter";
}
