// app/routepro/page.tsx - NDW RoutePro Home Page
// ✅ Supabase SSR integrato - Client corretto per Next.js 16+
// ✅ Whop INTEGRAZIONE REALE - API endpoint attivi
// ✅ UI premium con gestione errori e upgrade flow
// 🔴 CORRETTO: Tier allineati con DB (routepro_starter, routepro_pro, routepro_elite)
// 🔴 CORRETTO: API calls con metodo GET
// 🔴 CORRETTO: Enterprise → Elite

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Map, 
  Package, 
  Plus, 
  RefreshCw, 
  Trash2, 
  Navigation, 
  FileText, 
  Rocket, 
  Shield, 
  ChevronRight, 
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  Crown,
  Zap,
  ArrowRight
} from "lucide-react";

// =============================================
// TYPES - CORRETTI (allineati con DB)
// =============================================
type RouteRow = {
  id: string;
  name: string;
  route_date: string | null;
  status: "draft" | "optimized";
  total_stops: number;
  created_at: string;
};

// 🔴 CORRETTO: Allineato con valori REALI del DB
type UserTier = "free" | "routepro_starter" | "routepro_pro" | "routepro_elite";

// =============================================
// WHOP INTEGRATION - CHIAMATE API CORRETTE
// =============================================

/**
 * Verifica accesso Whop tramite API endpoint
 * 🔴 CORRETTO: GET invece di POST
 */
async function checkWhopAccess(): Promise<boolean> {
  try {
    const response = await fetch('/api/check-whop-access', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
      if (response.status === 401) return false;
      throw new Error(`HTTP error ${response.status}`);
    }
    
    const data = await response.json();
    return data.hasAccess;
  } catch (error) {
    console.error('Whop access check error:', error);
    return false;
  }
}

/**
 * Ottieni tier utente da API
 */
async function getUserTier(): Promise<UserTier> {
  try {
    const response = await fetch('/api/get-tier');
    
    if (!response.ok) {
      console.warn('Tier API error, fallback to free');
      return 'free';
    }
    
    const data = await response.json();
    return (data.tier || 'free') as UserTier;
  } catch (error) {
    console.error('Tier check error:', error);
    return 'free';
  }
}

/**
 * Sincronizza tier con Whop
 * 🔴 CORRETTO: GET e hasAccess
 */
async function syncTierWithWhop(): Promise<UserTier> {
  try {
    const response = await fetch('/api/check-whop-access', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) return 'free';
    
    const data = await response.json();
    return data.tier || 'free';
  } catch (error) {
    console.error('Tier sync error:', error);
    return 'free';
  }
}

// =============================================
// UTILITIES
// =============================================

/**
 * 🔴 NUOVA: Converte tier DB in nome display
 */
function getDisplayTier(tier: UserTier): string {
  switch(tier) {
    case 'routepro_starter': return 'Starter';
    case 'routepro_pro': return 'Pro';
    case 'routepro_elite': return 'Elite';
    default: return 'Free';
  }
}

function formatDate(dateString: string | null) {
  if (!dateString) return "—";
  try {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
}

function formatCreatedAt(dateString: string) {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateString;
  }
}

/**
 * 🔴 CORRETTO: Limiti per tier DB
 */
function getTierLimits(tier: UserTier) {
  switch(tier) {
    case 'routepro_starter':
      return { 
        maxStops: 10, 
        advancedFeatures: false, 
        driverMode: true,
        optimization: true,
        description: 'Piano Starter: fino a 10 stop, ottimizzazione base'
      };
    case 'routepro_pro':
      return { 
        maxStops: 50, 
        advancedFeatures: true,
        driverMode: true,
        optimization: true,
        api: true,
        description: 'Piano Pro: fino a 50 stop, API, ottimizzazione avanzata'
      };
    case 'routepro_elite':
      return { 
        maxStops: 999, 
        advancedFeatures: true,
        driverMode: true,
        optimization: true,
        api: true,
        team: true,
        description: 'Piano Elite: stop illimitati, team, supporto prioritario'
      };
    case 'free':
    default:
      return { 
        maxStops: 3, 
        advancedFeatures: false,
        driverMode: false,
        optimization: false,
        description: 'Piano Free: fino a 3 stop, solo import base'
      };
  }
}

/**
 * 🔴 CORRETTO: URL di upgrade per piano DB
 */
function getUpgradeUrl(plan: UserTier): string {
  const urls: Record<string, string> = {
    routepro_starter: process.env.NEXT_PUBLIC_WHOP_ROUTEPRO_STARTER_URL || 'https://whop.com/checkout/plan_EKxHpB7Pb0adv',
    routepro_pro: process.env.NEXT_PUBLIC_WHOP_ROUTEPRO_PRO_URL || 'https://whop.com/checkout/plan_tJluLgWpAiywp',
    routepro_elite: process.env.NEXT_PUBLIC_WHOP_ROUTEPRO_ELITE_URL || 'https://whop.com/checkout/plan_qc6NTliFYt80a',
  };
  
  return urls[plan] || urls.routepro_starter;
}

/**
 * 🔴 CORRETTO: Styling per tier DB
 */
function getTierStyles(tier: UserTier) {
  switch(tier) {
    case 'routepro_starter':
      return {
        bg: 'bg-blue-50/80',
        border: 'border-blue-200',
        text: 'text-blue-700',
        icon: 'text-blue-600',
        gradient: 'from-blue-50/50 to-blue-100/30',
        badge: 'bg-blue-100 text-blue-700 border-blue-200'
      };
    case 'routepro_pro':
      return {
        bg: 'bg-purple-50/80',
        border: 'border-purple-200',
        text: 'text-purple-700',
        icon: 'text-purple-600',
        gradient: 'from-purple-50/50 to-purple-100/30',
        badge: 'bg-purple-100 text-purple-700 border-purple-200'
      };
    case 'routepro_elite':
      return {
        bg: 'bg-amber-50/80',
        border: 'border-amber-200',
        text: 'text-amber-700',
        icon: 'text-amber-600',
        gradient: 'from-amber-50/50 to-amber-100/30',
        badge: 'bg-amber-100 text-amber-700 border-amber-200'
      };
    case 'free':
    default:
      return {
        bg: 'bg-neutral-50/80',
        border: 'border-neutral-200',
        text: 'text-neutral-700',
        icon: 'text-neutral-600',
        gradient: 'from-neutral-50/50 to-neutral-100/30',
        badge: 'bg-neutral-100 text-neutral-700 border-neutral-200'
      };
  }
}

// =============================================
// MAIN COMPONENT
// =============================================
export default function RouteProHome() {
  const router = useRouter();
  const supabase = createClient();
  
  // State
  const [checking, setChecking] = useState(true);
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tier, setTier] = useState<UserTier>('free');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // =============================================
  // LOAD ROUTES FROM SUPABASE
  // =============================================
  async function loadRoutes() {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: err } = await supabase
        .from("routes")
        .select("id, name, route_date, status, total_stops, created_at")
        .order("created_at", { ascending: false })
        .limit(30);

      if (err) {
        console.error("Errore caricamento rotte:", err);
        
        if (err.code === '42P01') {
          setError("La tabella 'routes' non esiste. Contatta l'assistenza.");
        } else if (err.code === '42501') {
          setError("Permessi insufficienti per leggere le rotte. Verifica le policies RLS.");
        } else {
          setError("Impossibile caricare le rotte. Riprova più tardi.");
        }
      } else {
        setRoutes((data as RouteRow[]) ?? []);
      }
    } catch (error) {
      console.error("Errore:", error);
      setError("Errore imprevisto nel caricamento delle rotte.");
    } finally {
      setIsLoading(false);
    }
  }

  // =============================================
  // DELETE ROUTE
  // =============================================
  async function deleteRoute(route: RouteRow) {
    const ok = confirm(
      `Eliminare la rotta "${route.name}"?\n\nVerranno eliminati anche tutti gli stop collegati.`
    );
    if (!ok) return;

    setBusyId(route.id);
    setMsg(null);

    try {
      const { error } = await supabase
        .from("routes")
        .delete()
        .eq("id", route.id);

      if (error) throw error;

      setMsg({ type: 'success', text: '✅ Rotta eliminata con successo' });
      await loadRoutes();
    } catch (e: any) {
      setMsg({ 
        type: 'error', 
        text: e?.message ?? 'Errore durante l\'eliminazione della rotta' 
      });
    } finally {
      setBusyId(null);
    }
  }

  /**
   * 🔴 CORRETTO: Handler upgrade con tier DB
   */
  const handleUpgrade = (plan: UserTier) => {
    window.location.href = getUpgradeUrl(plan);
  };

  // =============================================
  // INITIAL CHECK
  // =============================================
  useEffect(() => {
    (async () => {
      setChecking(true);
      setError(null);

      // 1. Controlla autenticazione
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error("Auth error:", authError);
        router.replace("/login");
        return;
      }

      // 2. Sincronizza tier con Whop (API reale)
      const userTier = await syncTierWithWhop();
      setTier(userTier);

      // 3. Verifica accesso RoutePro in base al tier
      const hasAccess = userTier !== 'free';
      
      if (!hasAccess) {
        setChecking(false);
        return;
      }

      // 4. Carica le rotte (solo se ha accesso)
      await loadRoutes();
      
      setChecking(false);
    })();
  }, [router, supabase]);

  // =============================================
  // RENDER - LOADING STATE
  // =============================================
  if (checking) {
    return (
      <main className="min-h-dvh bg-white text-neutral-900">
        <div className="flex items-center justify-center min-h-dvh">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="h-16 w-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-6" />
            <h2 className="text-xl font-semibold text-neutral-800 mb-2">
              Caricamento RoutePro
            </h2>
            <p className="text-sm text-neutral-600">
              Verifica accesso e caricamento rotte...
            </p>
          </div>
        </div>
      </main>
    );
  }

  // =============================================
  // RENDER - UPGRADE STATE (FREE TIER)
  // =============================================
  if (tier === 'free') {
    const styles = getTierStyles('free');
    
    return (
      <main className="min-h-dvh bg-white text-neutral-900">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/hub" className="flex items-center gap-3 group">
              <div className="h-9 w-9 rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center group-hover:border-primary/40 transition-colors">
                <Map className="h-5 w-5 text-primary/80" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold tracking-tight text-neutral-800">
                  RoutePro NDW
                </span>
                <span className="text-[11px] text-neutral-500">
                  Ottimizzazione percorsi • Free
                </span>
              </div>
            </Link>

            <div className="flex items-center gap-3">
              {/* Badge Free */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-neutral-50/80 border-neutral-200">
                <Shield className="h-3.5 w-3.5 text-neutral-600" />
                <span className="text-xs font-medium text-neutral-700">
                  NDW Free
                </span>
              </div>

              <Link href="/hub">
                <Button variant="ghost" size="sm" className="gap-2 text-neutral-600 hover:text-primary">
                  <ChevronRight className="h-3.5 w-3.5 rotate-180" />
                  <span className="hidden sm:inline">Torna a Hub</span>
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Hero Upgrade Section */}
        <section className="mx-auto w-full max-w-4xl px-4 py-16">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
              <Sparkles className="h-3 w-3" />
              RoutePro Premium
            </div>
            
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
              Sblocca RoutePro Premium
            </h1>
            
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
              Stai utilizzando RoutePro Free (3 stop massimo). 
              Attiva uno dei piani premium per accedere a funzionalità avanzate.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* Starter Card */}
            <Card className="relative rounded-2xl border border-blue-200 shadow-sm hover:shadow-md transition-all">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-700">
                  <Rocket className="h-5 w-5" />
                  Starter
                </CardTitle>
                <div className="mt-2">
                  <span className="text-3xl font-bold">€9</span>
                  <span className="text-neutral-600">/mese</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-2 text-neutral-700">
                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                    Fino a 10 stop per rotta
                  </li>
                  <li className="flex items-center gap-2 text-neutral-700">
                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                    Mappe interattive
                  </li>
                  <li className="flex items-center gap-2 text-neutral-700">
                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                    Ottimizzazione percorsi
                  </li>
                  <li className="flex items-center gap-2 text-neutral-700">
                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                    Modalità driver base
                  </li>
                </ul>
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={() => handleUpgrade('routepro_starter')}
                >
                  Attiva Starter
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            {/* Pro Card - Evidenziato */}
            <Card className="relative rounded-2xl border-2 border-purple-400 shadow-lg scale-105">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-purple-600 text-white text-xs px-3 py-1 rounded-full font-medium">
                  Consigliato
                </span>
              </div>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-700">
                  <Crown className="h-5 w-5" />
                  Pro
                </CardTitle>
                <div className="mt-2">
                  <span className="text-3xl font-bold">€19</span>
                  <span className="text-neutral-600">/mese</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-2 text-neutral-700">
                    <CheckCircle2 className="h-4 w-4 text-purple-600" />
                    Tutto dello Starter
                  </li>
                  <li className="flex items-center gap-2 text-neutral-700">
                    <CheckCircle2 className="h-4 w-4 text-purple-600" />
                    Fino a 50 stop per rotta
                  </li>
                  <li className="flex items-center gap-2 text-neutral-700">
                    <CheckCircle2 className="h-4 w-4 text-purple-600" />
                    API access
                  </li>
                  <li className="flex items-center gap-2 text-neutral-700">
                    <CheckCircle2 className="h-4 w-4 text-purple-600" />
                    Ottimizzazione avanzata
                  </li>
                </ul>
                <Button 
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  onClick={() => handleUpgrade('routepro_pro')}
                >
                  Attiva Pro
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            {/* Elite Card */}
            <Card className="rounded-2xl border border-amber-200 shadow-sm hover:shadow-md transition-all">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-700">
                  <Zap className="h-5 w-5" />
                  Elite
                </CardTitle>
                <div className="mt-2">
                  <span className="text-3xl font-bold">€49</span>
                  <span className="text-neutral-600">/mese</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-2 text-neutral-700">
                    <CheckCircle2 className="h-4 w-4 text-amber-600" />
                    Tutto del Pro
                  </li>
                  <li className="flex items-center gap-2 text-neutral-700">
                    <CheckCircle2 className="h-4 w-4 text-amber-600" />
                    Stop illimitati
                  </li>
                  <li className="flex items-center gap-2 text-neutral-700">
                    <CheckCircle2 className="h-4 w-4 text-amber-600" />
                    Team multi-utente
                  </li>
                  <li className="flex items-center gap-2 text-neutral-700">
                    <CheckCircle2 className="h-4 w-4 text-amber-600" />
                    Supporto prioritario
                  </li>
                </ul>
                <Button 
                  variant="outline"
                  className="w-full border-amber-300 hover:bg-amber-50"
                  onClick={() => handleUpgrade('routepro_elite')}
                >
                  Contattaci
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="mt-12 text-center text-sm text-neutral-500">
            <p>
              Già cliente? Hai già acquistato su Whop?{' '}
              <button 
                onClick={() => window.location.reload()}
                className="text-primary hover:underline font-medium"
              >
                Verifica il tuo accesso
              </button>
            </p>
          </div>
        </section>
      </main>
    );
  }

  // =============================================
  // RENDER - MAIN UI (SOLO PER TIER PAGANTI)
  // =============================================
  const tierLimits = getTierLimits(tier);
  const tierStyles = getTierStyles(tier);
  const displayTier = getDisplayTier(tier);

  return (
    <main className="min-h-dvh bg-white text-neutral-900">
      {/* ===== HEADER NDW STANDARD ===== */}
      <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
          {/* Logo + Nome RoutePro */}
          <Link href="/hub" className="flex items-center gap-3 group">
            <div className="h-9 w-9 rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center group-hover:border-primary/40 transition-colors">
              <Map className="h-5 w-5 text-primary/80" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight text-neutral-800">
                RoutePro NDW
              </span>
              <span className="text-[11px] text-neutral-500">
                Ottimizzazione percorsi • {displayTier}
              </span>
            </div>
          </Link>

          {/* Navigazione */}
          <div className="flex items-center gap-3">
            {/* Badge Piano - DINAMICO */}
            <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border ${tierStyles.bg} ${tierStyles.border}`}>
              <Shield className={`h-3.5 w-3.5 ${tierStyles.icon}`} />
              <span className={`text-xs font-medium ${tierStyles.text}`}>
                NDW {displayTier}
              </span>
            </div>

            {/* Pulsante Torna a Hub */}
            <Link href="/hub">
              <Button variant="ghost" size="sm" className="gap-2 text-neutral-600 hover:text-primary">
                <ChevronRight className="h-3.5 w-3.5 rotate-180" />
                <span className="hidden sm:inline">Torna a Hub</span>
              </Button>
            </Link>

            {/* Pulsante Home */}
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-neutral-600 hover:text-primary">
                Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ===== CONTENUTO PRINCIPALE ===== */}
      <section className="mx-auto w-full max-w-6xl px-4 py-8">
        
        {/* ===== MESSAGGI ===== */}
        {msg && (
          <div className={`
            mb-6 rounded-2xl border p-4
            ${msg.type === 'success' ? 'border-emerald-200 bg-emerald-50/80' : ''}
            ${msg.type === 'error' ? 'border-red-200 bg-red-50/80' : ''}
          `}>
            <div className="flex items-start gap-3">
              {msg.type === 'success' ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              )}
              <div className={`
                text-sm
                ${msg.type === 'success' ? 'text-emerald-800' : ''}
                ${msg.type === 'error' ? 'text-red-800' : ''}
              `}>
                {msg.text}
              </div>
            </div>
          </div>
        )}

        {/* ===== HERO SECTION ===== */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
            <Map className="h-3 w-3" />
            NDW Core • RoutePro {displayTier}
          </div>
          
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            RoutePro — Ottimizzazione Percorsi
          </h1>
          
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-600">
            Importa stop, ottimizza percorsi, esporta ordini. Risparmia tempo e carburante ogni giorno.
          </p>
          
          {/* Tier Info - DINAMICO */}
          <div className={`mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${tierStyles.bg} ${tierStyles.text} border ${tierStyles.border}`}>
            <Rocket className={`h-4 w-4 ${tierStyles.icon}`} />
            ⚡ {tierLimits.description}
          </div>
        </div>

        {/* ===== AZIONI PRINCIPALI ===== */}
        <div className="grid gap-4 sm:grid-cols-3 mb-8">
          {/* Card 1: Nuova Rotta */}
          <Card className="rounded-2xl border border-neutral-200/80 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-neutral-700 flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Plus className="h-4 w-4 text-primary" />
                </div>
                Nuova Rotta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-neutral-600 mb-4">
                Crea una nuova rotta da zero o importa da CSV
              </p>
              <Link href="/routepro/import">
                <Button className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Crea Rotta
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Card 2: Driver Mode - CONDIZIONALE */}
          <Card className="rounded-2xl border border-neutral-200/80 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-neutral-700 flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Navigation className="h-4 w-4 text-primary" />
                </div>
                Driver Mode
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-neutral-600 mb-4">
                Navigazione passo-passo con istruzioni vocali
              </p>
              <Link href="/routepro/driver">
                <Button 
                  variant="outline" 
                  className="w-full border-primary/30 hover:border-primary"
                  disabled={routes.length === 0}
                >
                  <Navigation className="mr-2 h-4 w-4" />
                  {routes.length === 0 ? 'Nessuna rotta' : 'Avvia Navigazione'}
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Card 3: Guida Rapida */}
          <Card className="rounded-2xl border border-neutral-200/80 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-neutral-700 flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                Guida Rapida
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-neutral-600 mb-4">
                Impara a usare RoutePro in 5 minuti
              </p>
              <Link href="/routepro/start">
                <Button variant="outline" className="w-full">
                  <FileText className="mr-2 h-4 w-4" />
                  Tutorial
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* ===== LISTA ROTTE ===== */}
        <Card className="rounded-2xl border border-neutral-200/80 shadow-sm">
          <CardHeader className="border-b border-neutral-100">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <Package className="h-4 w-4 text-primary" />
                  </div>
                  Le tue Rotte Recenti
                </CardTitle>
                <p className="text-sm text-neutral-600 mt-1">
                  {routes.length} rott{routes.length === 1 ? 'a' : 'e'} totali
                </p>
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={loadRoutes} 
                disabled={isLoading}
                className="border-neutral-300 hover:border-primary"
              >
                <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Caricamento...' : 'Aggiorna'}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {/* Error State */}
            {error ? (
              <div className="p-8 text-center">
                <div className="h-16 w-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="h-8 w-8 text-red-500" />
                </div>
                <h3 className="font-semibold text-neutral-800 mb-2">
                  Errore di caricamento
                </h3>
                <p className="text-sm text-neutral-600 mb-4 max-w-md mx-auto">
                  {error}
                </p>
                <Button 
                  variant="outline" 
                  onClick={loadRoutes}
                  className="mx-auto"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Riprova
                </Button>
              </div>
            ) : routes.length === 0 ? (
              <div className="p-8 text-center">
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Map className="h-10 w-10 text-primary/60" />
                </div>
                <h3 className="text-lg font-semibold text-neutral-800 mb-2">
                  Nessuna rotta ancora
                </h3>
                <p className="text-sm text-neutral-600 mb-6 max-w-md mx-auto">
                  Crea la tua prima rotta per iniziare a ottimizzare i percorsi.
                </p>
                <Link href="/routepro/import">
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Crea la prima rotta
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {routes.map((route) => (
                  <div
                    key={route.id}
                    className="p-5 hover:bg-neutral-50/80 transition-colors group"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      
                      {/* Info Rotta */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3">
                          
                          {/* Status Icon */}
                          <div className={`
                            p-2.5 rounded-xl
                            ${route.status === 'optimized' ? 'bg-emerald-100' : 'bg-amber-100'}
                          `}>
                            {route.status === 'optimized' ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <Clock className="h-4 w-4 text-amber-600" />
                            )}
                          </div>
                          
                          {/* Route Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div>
                                <h3 className="font-semibold text-neutral-900 truncate">
                                  {route.name}
                                </h3>
                                
                                <div className="flex flex-wrap gap-3 mt-2">
                                  {/* Data */}
                                  <div className="flex items-center gap-1.5 text-xs text-neutral-600">
                                    <Calendar className="h-3.5 w-3.5" />
                                    {formatDate(route.route_date)}
                                  </div>
                                  
                                  {/* Stops Count - Mostra limite tier */}
                                  <div className="flex items-center gap-1.5 text-xs text-neutral-600">
                                    <Package className="h-3.5 w-3.5" />
                                    {route.total_stops} stop
                                    {route.total_stops > tierLimits.maxStops && (
                                      <span className="text-amber-600 text-[10px] ml-1">
                                        (supera limite {tierLimits.maxStops})
                                      </span>
                                    )}
                                  </div>
                                  
                                  {/* Status Badge */}
                                  <div className={`
                                    text-xs px-2.5 py-1 rounded-full font-medium
                                    ${route.status === 'optimized' 
                                      ? 'bg-emerald-100 text-emerald-700' 
                                      : 'bg-amber-100 text-amber-700'
                                    }
                                  `}>
                                    {route.status === 'optimized' ? 'Ottimizzata' : 'Bozza'}
                                  </div>
                                </div>
                                
                                {/* Creation Date */}
                                <div className="text-xs text-neutral-500 mt-2">
                                  Creata il {formatCreatedAt(route.created_at)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Link href={`/routepro/routes/${route.id}`}>
                          <Button 
                            variant="outline" 
                            className="w-full justify-start border-primary/30 hover:border-primary"
                          >
                            <ChevronRight className="mr-2 h-4 w-4" />
                            Gestisci
                          </Button>
                        </Link>
                        
                        <Link href={`/routepro/routes/${route.id}/driver`}>
                          <Button 
                            variant="outline" 
                            className="w-full justify-start"
                            disabled={route.status !== 'optimized'}
                          >
                            <Navigation className="mr-2 h-4 w-4" />
                            Driver Mode
                          </Button>
                        </Link>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteRoute(route)}
                          disabled={busyId === route.id}
                          className="text-neutral-400 hover:text-red-500 hover:bg-red-50"
                          title="Elimina rotta"
                        >
                          {busyId === route.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ===== INFO PIANO - DINAMICO CON STILI ===== */}
        <div className={`mt-8 p-5 rounded-2xl border bg-gradient-to-r ${tierStyles.gradient} ${tierStyles.border}`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${tierStyles.bg}`}>
                <Shield className={`h-5 w-5 ${tierStyles.icon}`} />
              </div>
              <div>
                <h3 className="font-medium text-neutral-800">
                  Piano RoutePro {displayTier} Attivo
                </h3>
                <p className="text-sm text-neutral-600 mt-1">
                  {tier === 'routepro_starter' 
                    ? "Stai utilizzando RoutePro Starter. Sblocca più stop e automazioni con l'upgrade a Pro."
                    : tier === 'routepro_pro'
                    ? "Hai accesso a tutte le funzionalità RoutePro Pro. Sblocca supporto prioritario con Elite."
                    : "Hai accesso completo a tutte le funzionalità RoutePro Elite."}
                </p>
              </div>
            </div>
            
            <Link href="/hub">
              <Button 
                variant="outline" 
                className={`whitespace-nowrap border-${tierStyles.border} hover:bg-${tierStyles.bg}`}
              >
                Gestisci Piano
              </Button>
            </Link>
          </div>
        </div>

        {/* ===== BANNER UPGRADE PER STARTER ===== */}
        {tier === 'routepro_starter' && (
          <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-purple-50/50 to-purple-100/30 border border-purple-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100">
                  <Crown className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-medium text-purple-900">
                    Passa a Pro e raddoppia i tuoi limiti
                  </h4>
                  <p className="text-sm text-purple-700">
                    Da 10 a 50 stop per rotta + API access
                  </p>
                </div>
              </div>
              <Button 
                className="bg-purple-600 hover:bg-purple-700"
                onClick={() => handleUpgrade('routepro_pro')}
              >
                Scopri Pro
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* ===== FOOTER NDW STANDARD ===== */}
      <footer className="border-t border-neutral-200 mt-12">
        <div className="mx-auto w-full max-w-6xl px-4 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center">
                <Map className="h-3 w-3 text-primary/70" />
              </div>
              <div>
                <div className="text-xs font-medium text-neutral-700">
                  RoutePro NDW • {displayTier}
                </div>
                <div className="text-[11px] text-neutral-500">
                  Nota Digital Works • {new Date().getFullYear()}
                </div>
              </div>
            </div>
            
            <div className="text-xs text-neutral-500 flex items-center gap-4">
              <span>
                {routes.length} rott{routes.length === 1 ? 'a' : 'e'} attiv{routes.length === 1 ? 'a' : 'e'}
              </span>
              <span className="h-1 w-1 rounded-full bg-neutral-300" />
              <span className="text-primary font-medium">
                v1.0 • MVP
              </span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}