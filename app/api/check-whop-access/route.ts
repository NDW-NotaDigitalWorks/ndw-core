// 📁 app/api/check-whop-access/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server'; // CAMBIATO: createServerClient → createClient

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  console.log('🔐 check-whop-access - start');
  
  try {
    const supabase = await createClient(); // CAMBIATO: createServerClient → createClient
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log('❌ No authenticated user');
      return NextResponse.json(
        { hasAccess: false, tier: null, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log(`👤 User: ${user.email} (${user.id})`);

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('whop_tier')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('❌ Error fetching profile:', profileError);
      return NextResponse.json({
        hasAccess: false,
        tier: 'free',
        isAuthenticated: true,
      });
    }

    const tier = profile?.whop_tier || 'free';
    const hasAccess = tier !== 'free';

    console.log(`✅ Access check: tier=${tier}, hasAccess=${hasAccess}`);

    return NextResponse.json({
      hasAccess,
      tier,
      isAuthenticated: true,
    });

  } catch (error) {
    console.error('❌ check-whop-access error:', error);
    return NextResponse.json(
      { hasAccess: false, tier: 'free', error: 'Internal server error' },
      { status: 500 }
    );
  }
}