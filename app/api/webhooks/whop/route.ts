export const dynamic = 'force-dynamic'; // Evita caching
// app/api/webhooks/whop/route.ts
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { headers } from 'next/headers';

// Inizializza SDK Whop - RIUTILIZZO file esistente
import { whop } from '@/lib/whop-sdk';

export async function POST(request: Request) {
  try {
    const headersList = headers();
    const signature = (await headersList).get('x-whop-webhook-signature');
    export async function POST(request: Request) {
  console.log('📥 Webhook ricevuto - INIZIO');
  
  try {
    
    // Verifica webhook secret
    if (!signature || signature !== process.env.WHOP_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload = await request.json();
    const { type, data } = payload;

    console.log('📦 Whop webhook received:', { type, data });

    // Inizializza Supabase admin client (bypassa RLS)
    const supabase = createAdminClient();

    // Gestisci diversi tipi di eventi Whop
    switch (type) {
      case 'license.created':
      case 'license.activated':
        // Nuovo abbonamento o attivazione
        await handleLicenseCreated(supabase, data);
        break;
      
      case 'license.cancelled':
      case 'license.expired':
        // Abbonamento cancellato o scaduto → torna a FREE
        await handleLicenseCancelled(supabase, data);
        break;
      
      case 'license.updated':
        // Cambio piano (es. STARTER → PRO)
        await handleLicenseUpdated(supabase, data);
        break;
      
      default:
        console.log('⚠️ Unhandled webhook type:', type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Funzioni helper
async function handleLicenseCreated(supabase: any, data: any) {
  const { user: whopUser, plan, id: licenseId } = data;
  
  // Mappa piano Whop al nostro tier
  const tier = mapPlanToTier(plan.id);
  
  // Cerca utente via email
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('email', whopUser.email)
    .single();

  if (profile) {
    // Utente esistente → aggiorna tier
    const { error } = await supabase
      .from('profiles')
      .update({ 
        whop_tier: tier,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', profile.user_id);

    if (error) console.error('Error updating tier:', error);
    else console.log(`✅ Upgraded ${whopUser.email} to ${tier}`);
  } else {
    console.log('⚠️ User not found:', whopUser.email);
    // Qui potresti creare un utente in attesa o loggare
  }
}

async function handleLicenseCancelled(supabase: any, data: any) {
  const { user: whopUser } = data;
  
  const { error } = await supabase
    .from('profiles')
    .update({ 
      whop_tier: 'free',
      updated_at: new Date().toISOString()
    })
    .eq('email', whopUser.email);

  if (error) console.error('Error downgrading tier:', error);
  else console.log(`⬇️ Downgraded ${whopUser.email} to free`);
}

async function handleLicenseUpdated(supabase: any, data: any) {
  const { user: whopUser, plan } = data;
  const tier = mapPlanToTier(plan.id);
  
  const { error } = await supabase
    .from('profiles')
    .update({ 
      whop_tier: tier,
      updated_at: new Date().toISOString()
    })
    .eq('email', whopUser.email);

  if (error) console.error('Error updating tier:', error);
  else console.log(`🔄 Updated ${whopUser.email} to ${tier}`);
}

// Mappa gli ID piano Whop ai nostri tier
function mapPlanToTier(planId: string): string {
  const planMap: Record<string, string> = {
    [process.env.WHOP_PLAN_ROUTEPRO_STARTER || '']: 'starter',
    [process.env.WHOP_PLAN_ROUTEPRO_PRO || '']: 'pro',
    [process.env.WHOP_PLAN_ROUTEPRO_ELITE || '']: 'enterprise',
  };
  
  return planMap[planId] || 'free';
}