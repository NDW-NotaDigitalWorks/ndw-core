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
  if (profile.internal_account === true) return 'routepro_elite';
  if (profile.whop_subscription_status === 'active' && profile.whop_tier) return profile.whop_tier;
  return 'free';
}
