// middleware-semplice.ts (RINOMINA il file originale in middleware-old.ts)
import { type NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  console.log('🔍 MIDDLEWARE SEMPLICE - PATH:', request.nextUrl.pathname);
  
  // Per ora lasciamo passare TUTTO
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};