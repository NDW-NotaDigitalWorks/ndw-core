// 📁 lib/entitlement-client.ts - PER COMPONENTI NEL BROWSER
import { createClient } from '@/lib/supabase/client';

export async function getClientTier() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user?.id) return 'free';
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('whop_tier, whop_subscription_status, internal_account, role')
    .eq('id', user.id)
    .single();
  
  if (!profile) return 'free';
  
  // 🚀 REGOLA: internal_account = ELITE
  if (profile.internal_account === true) {
    console.log(`🏢 Account interno: ${user.email}`);
    return 'routepro_elite';
  }
  
  // Altrimenti, piano Whop
  if (profile.whop_subscription_status === 'active' && profile.whop_tier) {
    return profile.whop_tier;
  }
  
  return 'free';
}

// Funzione per controllare se ha accesso
export async function hasClientAccess() {
  const tier = await getClientTier();
  return ['routepro_starter', 'routepro_pro', 'routepro_elite'].includes(tier);
}

