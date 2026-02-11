// app/api/check-whop-access/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { whop } from '@/lib/whop-sdk';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // 1. Verifica autenticazione
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Ottieni profilo utente
    const { data: profile } = await supabase
      .from('profiles')
      .select('whop_tier, email')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // 3. Se è già premium, verifica che la licenza sia ancora attiva
    if (profile.whop_tier !== 'free') {
      try {
        // Query Whop API per verificare licenze attive di questo utente
        const licenses = await whop.licenses.list({
          email: profile.email,
          status: 'active'
        });

        const hasValidLicense = licenses.data && licenses.data.length > 0;
        
        if (!hasValidLicense) {
          // Nessuna licenza attiva → downgrade a free
          await supabase
            .from('profiles')
            .update({ whop_tier: 'free' })
            .eq('user_id', user.id);
          
          return NextResponse.json({ 
            tier: 'free',
            synced: true,
            message: 'License expired, downgraded to free'
          });
        }
      } catch (error) {
        console.error('Whop API error:', error);
        // Se Whop è down, manteniamo tier corrente (fail open)
      }
    }

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