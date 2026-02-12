// 📁 lib/entitlement.ts - VERSIONE FINALE PROFESSIONALE
import { createClient } from '@/lib/supabase/server';
import { cache } from 'react';

export type RouteProTier = "starter" | "pro" | "elite";

// ✅ REGOLA UNICA: internal_account = ELITE PER SEMPRE
// ✅ NIENTE HARDCODED EMAIL, NIENTE MAGIC STRINGS
// ✅ SCALABILE: basta settare internal_account = true
export const getUserTier = cache(async () => {
  const supabase = await createClient();
  
  // 1. Prendi utente
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) return 'free';
  
  // 2. Prendi profilo COMPLETO
  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      whop_tier,
      whop_subscription_status,
      internal_account,
      role
    `)
    .eq('id', user.id)
    .single();
  
  if (!profile) return 'free';
  
  // 3. 🚀 REGOLA #1 - Account interno = ELITE (nessuna eccezione)
  if (profile.internal_account === true) {
    console.log(`🏢 Internal account (${profile.role || 'staff'}): ${user.email}`);
    return 'routepro_elite';
  }
  
  // 4. REGOLA #2 - Whop subscription attiva
  if (profile.whop_subscription_status === 'active' && profile.whop_tier) {
    return profile.whop_tier;
  }
  
  // 5. Fallback a free
  return 'free';
});

// Helper per check rapido accesso
export async function hasRouteProAccess(): Promise<boolean> {
  const tier = await getUserTier();
  return ['routepro_starter', 'routepro_pro', 'routepro_elite'].includes(tier);
}

// Helper per ottenere tier "pulito" (starter/pro/elite)
export async function getRouteProTier(): Promise<RouteProTier | null> {
  const tier = await getUserTier();
  
  if (tier === 'routepro_elite') return 'elite';
  if (tier === 'routepro_pro') return 'pro';
  if (tier === 'routepro_starter') {
    // Controlla trial
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: trial } = await supabase
        .from("routepro_trial")
        .select("trial_expires_at")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (trial?.trial_expires_at && Date.now() < new Date(trial.trial_expires_at).getTime()) {
        return 'pro';
      }
    }
    return 'starter';
  }
  
  return null;
}

// ✅ NUOVO: Verifica se utente è internal
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

// ✅ NUOVO: Ottieni ruolo interno
export async function getInternalRole(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) return null;
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
    
  return profile?.role || null;
}