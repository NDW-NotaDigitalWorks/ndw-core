// 📁 app/api/get-tier/route.ts
import { NextResponse } from 'next/server';
import { getUserTier, isInternalAccount } from '@/lib/entitlement';

export async function GET() {
  try {
    const tier = await getUserTier();
    const isInternal = await isInternalAccount();
    
    return NextResponse.json({ 
      tier,
      isInternal,
      planUrls: {
        starter: 'https://whop.com/checkout/routepro-starter/',
        pro: 'https://whop.com/checkout/routepro-pro/',
        elite: 'https://whop.com/checkout/routepro-elite/'
      }
    });
    
  } catch (error) {
    console.error('Error in get-tier:', error);
    return NextResponse.json({ 
      tier: 'free', 
      isInternal: false,
      planUrls: {} 
    });
  }
}