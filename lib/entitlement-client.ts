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
  
  // PRIORITÀ 1: internal_account = true -> ELITE
  if (profile.internal_account === true) return 'routepro_elite';
  
  // PRIORITÀ 2: Whop attivo
  if (profile.whop_subscription_status === 'active' && profile.whop_tier) {
    return profile.whop_tier;
  }
  
  return 'free';
}

export async function hasClientAccess(): Promise<boolean> {
  const tier = await getClientTier();
  return ['routepro_starter', 'routepro_pro', 'routepro_elite'].includes(tier);
}

export async function isClientInternalAccount(): Promise<boolean> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) return false;
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('internal_account')
    .eq('id', user.id)
    .single();
    
  return profile?.internal_account === true;
}
