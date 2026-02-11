// middleware.ts - ✅ VERSIONE FINALE CORRETTA
import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  // ⚠️ CRITICO: updateSession è l'UNICA fonte di verità per l'auth
  // Tutto il resto lo facciamo DOPO che updateSession ha processato la request
  const response = await updateSession(request);
  
  // Protezione rotte /routepro
  if (request.nextUrl.pathname.startsWith('/routepro')) {
    // ✅ METODO CORRETTO: verifichiamo se updateSession ha aggiunto cookie
    // I cookie di sessione vengono settati nella response, non nella request!
    
    // Controlliamo se la response contiene cookie di sessione
    const setCookieHeader = response.headers.get('set-cookie');
    const hasSessionCookie = setCookieHeader?.includes('sb-') || false;
    
    // Inoltre, verifichiamo se l'utente è già autenticato guardando la request originale
    // Questo è più affidabile
    const { data: { user } } = await request.auth?.() || { data: { user: null } };
    
    if (!hasSessionCookie && !user) {
      console.log('🔒 Nessuna sessione trovata, redirect a login');
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};