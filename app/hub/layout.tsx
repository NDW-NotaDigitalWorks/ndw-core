// app/hub/layout.tsx
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default async function HubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Controlla se l'utente è autenticato (SERVER-SIDE)
  const { data: { user } } = await supabase.auth.getUser();
  
  // 2. Se NON c'è utente, redirect a /login
  if (!user) {
    redirect('/login');
  }

  // 3. Se c'è utente, mostra il contenuto
  return (
    <div className="min-h-dvh bg-white">
      {children}
    </div>
  );
}