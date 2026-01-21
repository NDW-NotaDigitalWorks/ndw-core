// lib/entitlement.ts
import { supabase } from "@/lib/supabaseClient";

/**
 * Check if the logged user has an active entitlement
 * for a given product code (e.g. "routepro-starter")
 */
export async function hasActiveEntitlement(
  productCode: string
): Promise<boolean> {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return false;

  const { data, error } = await supabase
    .from("entitlements")
    .select("id,status")
    .eq("user_id", userData.user.id)
    .eq("product_code", productCode)
    .eq("status", "active")
    .maybeSingle();

  if (error) return false;
  return !!data;
}
