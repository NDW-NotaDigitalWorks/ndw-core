// app/routepro/layout.tsx - PROTEZIONE SERVER-SIDE
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function RouteProLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.log('🔒 RouteProLayout: utente non autenticato');
    redirect('/login?redirect=/routepro');
  }
  
  console.log(`✅ RouteProLayout: ${user.email} autenticato`);
  
  return <>{children}</>;
}