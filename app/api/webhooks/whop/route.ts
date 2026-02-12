// 📁 app/api/webhooks/whop/route.ts
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { headers } from 'next/headers';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// 🔴 RIMOSSO: Whop SDK - non necessario per webhook
// La verifica firma usa solo crypto, non serve SDK

export async function POST(request: Request) {
  console.log('📥 Whop webhook received -', new Date().toISOString());
  
  try {
    // 1. VERIFICA FIRMA WEBHOOK
    const headersList = await headers();
    const signature = headersList.get('x-whop-signature');
    const body = await request.text();
    
    if (!signature) {
      console.error('❌ Missing webhook signature');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      );
    }

    const secret = process.env.WHOP_WEBHOOK_SECRET;
    if (!secret) {
      console.error('❌ WHOP_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.error('❌ Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // 2. PARSE PAYLOAD
    const payload = JSON.parse(body);
    console.log('📦 Webhook payload:', {
      type: payload.type,
      data: payload.data,
    });

    const eventType = payload.type;
    const whopUserId = payload.data.user_id;
    const whopSubscriptionId = payload.data.subscription_id;
    const planId = payload.data.plan_id;

    if (!whopUserId || !whopSubscriptionId) {
      console.error('❌ Missing required fields in payload');
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 3. MAPPA PLAN ID A TIER
    const planToTier: Record<string, string> = {
      [process.env.WHOP_PLAN_ROUTEPRO_STARTER!]: 'routepro_starter',
      [process.env.WHOP_PLAN_ROUTEPRO_PRO!]: 'routepro_pro',
      [process.env.WHOP_PLAN_ROUTEPRO_ELITE!]: 'routepro_elite',
    };

    let tier = 'free';
    
    // 4. GESTISCI TIPO EVENTO
    switch (eventType) {
      case 'subscription.created':
      case 'subscription.updated':
        tier = planToTier[planId] || 'free';
        console.log(`🔄 Subscription ${eventType}: setting tier to ${tier}`);
        break;
        
      case 'subscription.cancelled':
      case 'subscription.expired':
        tier = 'free';
        console.log(`🔄 Subscription ${eventType}: setting tier to free`);
        break;
        
      default:
        console.log(`⏭️ Unhandled event type: ${eventType}`);
        return NextResponse.json({ received: true });
    }

    // 5. CERCA UTENTE NEL DB SUPABASE TRAMITE whop_user_id
    const supabase = createAdminClient();
    
    const { data: profile, error: findError } = await supabase
      .from('profiles')
      .select('user_id, whop_tier, email')
      .eq('whop_user_id', whopUserId)
      .maybeSingle();

    if (findError) {
      console.error('❌ Error finding profile:', findError);
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }

    if (!profile) {
      console.log(`⚠️ No profile found for whop_user_id: ${whopUserId}`);
      return NextResponse.json({ 
        received: true, 
        warning: 'User not found - webhook stored but not linked',
        whopUserId,
        eventType,
        tier
      });
    }

    // 6. AGGIORNA TIER
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        whop_tier: tier,
        whop_subscription_id: whopSubscriptionId,
        whop_plan_id: planId,
        whop_subscription_status: eventType.split('.')[1],
        whop_last_sync: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', profile.user_id);

    if (updateError) {
      console.error('❌ Error updating profile tier:', updateError);
      return NextResponse.json(
        { error: 'Failed to update tier' },
        { status: 500 }
      );
    }

    console.log(`✅ Successfully updated user ${profile.email} (${profile.user_id}) to tier: ${tier}`);
    
    return NextResponse.json({ 
      success: true,
      tier,
      userId: profile.user_id,
      email: profile.email
    });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}