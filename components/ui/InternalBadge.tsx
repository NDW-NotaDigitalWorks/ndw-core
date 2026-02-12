// 📁 components/ui/InternalBadge.tsx
'use client';

import { Building2, Crown, Shield } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type InternalRole = 'ceo' | 'staff' | null;

export function InternalBadge() {
  const [isInternal, setIsInternal] = useState(false);
  const [role, setRole] = useState<InternalRole>(null);
  
  useEffect(() => {
    const checkInternal = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('internal_account, role')
        .eq('id', user.id)
        .single();
      
      if (profile?.internal_account) {
        setIsInternal(true);
        setRole(profile.role as InternalRole);
      }
    };
    
    checkInternal();
  }, []);
  
  if (!isInternal) return null;
  
  const config = {
    ceo: {
      icon: Crown,
      text: 'CEO - ELITE LIFETIME',
      bg: 'from-amber-400 to-yellow-500',
      iconColor: 'text-yellow-600'
    },
    staff: {
      icon: Shield,
      text: 'STAFF - ELITE ACCESS',
      bg: 'from-blue-400 to-indigo-500',
      iconColor: 'text-blue-600'
    }
  };
  
  const { icon: Icon, text, bg, iconColor } = config[role || 'staff'];
  
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`bg-gradient-to-r ${bg} text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2`}>
        <Icon className="w-5 h-5" />
        <span className="font-semibold">{text}</span>
      </div>
    </div>
  );
}