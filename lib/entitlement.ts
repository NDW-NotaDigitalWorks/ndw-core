import { createClient } from '@/lib/supabase/server';
import { cache } from 'react';

export type RouteProTier = "starter" | "pro" | "elite";

export const getUserTier = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) return 'free';
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('whop_tier, whop_subscription_status, internal_account, role')
    .eq('id', user.id)
    .single();
  
  if (!profile) return 'free';
  
  // PRIORITÀ 1: internal_account = true -> ELITE
  if (profile.internal_account === true) return 'routepro_elite';
  
  // PRIORITÀ 2: Whop attivo
  if (profile.whop_subscription_status === 'active' && profile.whop_tier) {
    return profile.whop_tier;
  }
  
  return 'free';
});

// Alias per retrocompatibilità
export const getRouteProTier = getUserTier;

export async function hasRouteProAccess(): Promise<boolean> {
  const tier = await getUserTier();
  return ['routepro_starter', 'routepro_pro', 'routepro_elite'].includes(tier);
}

export async function isInternalAccount(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) return false;
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('internal_account')
    .eq('id', user.id)
    .single();
    
  return profile?.internal_account === true;
}
