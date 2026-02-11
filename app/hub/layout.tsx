// app/hub/layout.tsx - ✅ VERSIONE CORRETTA con @supabase/ssr
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server'; // ✅ import corretto
import { Suspense } from 'react';

export default async function HubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  
  // ✅ getUser() - NON getSession()!
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  return (
    <Suspense fallback={
      <div className="min-h-dvh flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-4 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-neutral-600">Caricamento NDW Hub...</p>
        </div>
      </div>
    }>
      {children}
    </Suspense>
  );
}