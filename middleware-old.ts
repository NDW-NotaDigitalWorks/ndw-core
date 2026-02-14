// middleware.ts - ✅ VERSIONE CON DEBUG
import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  console.log('🔍 MIDDLEWARE INIZIO - PATH:', request.nextUrl.pathname);
  
  // updateSession è l'UNICA fonte di verità
  const response = await updateSession(request);
  
  // Protezione rotte /routepro
  if (request.nextUrl.pathname.startsWith('/routepro')) {
    console.log('🛡️ ROTTA PROTETTA RILEVATA:', request.nextUrl.pathname);
    
    // ✅ METODO CORRETTO: crea un client Supabase per leggere l'utente
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    console.log('👤 USER TROVATO?', user ? `Sì (${user.email})` : 'No');
    
    if (!user) {
      console.log('🔒 Nessuna sessione trovata, redirect a login');
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    // ✅ VERIFICA ACCOUNT INTERNO (CEO/STAFF)
    const { data: profile } = await supabase
      .from('profiles')
      .select('internal_account, whop_tier, whop_subscription_status')
      .eq('id', user.id)
      .single();

    console.log('📊 PROFILO TROVATO?', profile ? 'Sì' : 'No', profile);

    // 🚀 REGOLA #1: Account interno = ACCESSO GARANTITO (ELITE)
    if (profile?.internal_account === true) {
      console.log(`🏢 Account interno (${user.email}) - accesso ELITE garantito`);
      return response; // ✅ Passa senza alcun controllo Whop
    }

    // 📋 REGOLA #2: Utente normale - verifica subscription Whop
    const hasAccess = profile?.whop_subscription_status === 'active' && 
                     ['routepro_starter', 'routepro_pro', 'routepro_elite'].includes(profile?.whop_tier || '');

    if (!hasAccess) {
      console.log('❌ Utente senza accesso RoutePro, redirect a pricing');
      return NextResponse.redirect(new URL('/pricing', request.url));
    }
    
    console.log('✅ Accesso consentito a:', request.nextUrl.pathname);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};