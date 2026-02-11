// app/api/check-whop-access/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { whop } from '@/lib/whop-sdk';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('whop_tier, email')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // ? VERSIONE SEMPLIFICATA - Affidati ai webhook per aggiornamenti
    return NextResponse.json({ 
      tier: profile.whop_tier || 'free',
      synced: true 
    });

  } catch (error) {
    console.error('Check access error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
