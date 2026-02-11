// app/api/get-tier/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ tier: 'free' }); // Non autenticato = free
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('whop_tier')
      .eq('user_id', user.id)
      .single();

    return NextResponse.json({ 
      tier: profile?.whop_tier || 'free',
      userId: user.id
    });

  } catch (error) {
    console.error('Get tier error:', error);
    return NextResponse.json({ tier: 'free' }); // Fail safe
  }
}