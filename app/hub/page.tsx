// app/hub/page.tsx - ✅ CORRETTO con fix navigazione RoutePro
"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, LayoutDashboard, Home, LogOut, Package, Rocket, Zap, Shield } from "lucide-react";

export default function HubPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  // Carica l'email dell'utente
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? null);
    })();
  }, []);

  async function onLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  // 🔴 FIX: Navigazione pulita verso RoutePro
  const handleRouteProClick = () => {
    // Forza refresh completo per ricaricare stato autenticazione
    window.location.href = '/routepro';
  };

  return (
    <main className="min-h-dvh bg-white text-neutral-900">
      {/* ===== HEADER NDW STANDARD ===== */}
      <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
          {/* Logo + Nome NDW */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-9 w-9 rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center group-hover:border-primary/40 transition-colors">
              <div className="h-5 w-5 rounded-md bg-primary/80" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight text-neutral-800">NDW Hub</span>
              <span className="text-[11px] text-neutral-500">Nota Digital Works • Dashboard</span>
            </div>
          </Link>

          {/* Navigazione e User */}
          <div className="flex items-center gap-3">
            {/* User Email */}
            {email && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-100">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-medium text-neutral-700 truncate max-w-[180px]">
                  {email}
                </span>
              </div>
            )}

            {/* Pulsante Home */}
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2 text-neutral-600 hover:text-primary">
                <Home className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Home</span>
              </Button>
            </Link>

            {/* Pulsante Logout */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onLogout}
              className="gap-2 border-neutral-300 hover:border-red-300 hover:bg-red-50 hover:text-red-600"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* ===== CONTENUTO PRINCIPALE ===== */}
      <section className="mx-auto w-full max-w-6xl px-4 py-8">
        {/* Hero Section */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
            <LayoutDashboard className="h-3 w-3" />
            NDW Core • Dashboard Centrale
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Benvenuto in NDW Hub
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-600">
            Il centro di controllo per tutti i tuoi strumenti NDW. Da qui gestisci prodotti, piani e automazioni.
            <span className="block mt-2 text-xs text-primary font-medium bg-primary/5 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5">
              <Shield className="h-3 w-3" />
              Accesso protetto • Sessione attiva
            </span>
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-3 mb-8">
          <KpiCard 
            title="Prodotti attivi" 
            value="1" 
            note="RoutePro (MVP)" 
            icon={<Package className="h-4 w-4" />}
            color="primary"
          />
          <KpiCard 
            title="Stato piano" 
            value="Free" 
            note="Upgrade quando vuoi" 
            icon={<Rocket className="h-4 w-4" />}
            color="emerald"
          />
          <KpiCard 
            title="Automazioni" 
            value="0" 
            note="in arrivo" 
            icon={<Zap className="h-4 w-4" />}
            color="amber"
          />
        </div>

        {/* Grid Prodotti e Azioni */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Card Prodotti */}
          <Card className="rounded-2xl border border-neutral-200/80 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Package className="h-4 w-4 text-primary" />
                </div>
                I tuoi Prodotti NDW
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ProductRow 
                name="RoutePro" 
                badge="MVP" 
                href="/routepro" 
                description="Ottimizzazione percorsi per driver e logistica"
                icon={<Package className="h-4 w-4" />}
              />
              <ProductRow 
                name="Ristorazione NDW" 
                badge="In arrivo" 
                href="#" 
                disabled 
                description="Gestione ristorante, turni, inventario"
                icon={<Package className="h-4 w-4" />}
              />
              <ProductRow 
                name="Beauty NDW" 
                badge="In arrivo" 
                href="#" 
                disabled 
                description="Agenda, CRM, magazzino per estetiste"
                icon={<Package className="h-4 w-4" />}
              />
              
              <div className="pt-3 border-t border-neutral-100">
                <p className="text-xs text-neutral-500">
                  Ogni prodotto include <span className="text-primary font-medium">NDW Core</span> (agenda, checklist, dashboard)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Card Azioni Rapide - 🔴 FIX APPLICATO */}
          <Card className="rounded-2xl border border-neutral-200/80 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Zap className="h-4 w-4 text-primary" />
                </div>
                Azioni Rapide
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {/* 🔴 FIX: Sostituito Link con Button + onClick */}
              <Button 
                className="w-full justify-start h-11 bg-primary hover:bg-primary/90"
                onClick={handleRouteProClick}
              >
                <Package className="mr-3 h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">Apri RoutePro</div>
                  <div className="text-xs text-primary-foreground/80">Ottimizza i tuoi percorsi</div>
                </div>
              </Button>

              {/* Agenda - Manteniamo Link per ora (funziona) */}
              <Link href="/agenda">
                <Button variant="outline" className="w-full justify-start h-11 border-primary/30 hover:border-primary hover:bg-primary/5">
                  <Calendar className="mr-3 h-4 w-4" />
                  <div className="text-left">
                    <div className="font-medium">Apri Agenda NDW</div>
                    <div className="text-xs text-neutral-500">Pianifica lavoro e appuntamenti</div>
                  </div>
                </Button>
              </Link>

              {/* Upgrade - Disabilitato per ora */}
              <Button variant="secondary" className="w-full justify-start h-11" disabled>
                <Rocket className="mr-3 h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">Vedi piani e upgrade</div>
                  <div className="text-xs text-neutral-500">Disponibile a breve</div>
                </div>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Sezione Informazioni */}
        <div className="mt-8 p-4 rounded-2xl bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-neutral-800">NDW Core Attivo</h3>
              <p className="text-sm text-neutral-600 mt-1">
                Stai utilizzando le funzioni base di NDW Core (dashboard, navigazione, sicurezza).
                Le funzioni avanzate richiedono un piano <span className="font-medium text-primary">NDW Starter</span> o superiore.
              </p>
              <div className="flex gap-3 mt-3">
                <Button size="sm" variant="outline" className="text-xs border-primary/30">
                  Scopri i piani NDW
                </Button>
                <Button size="sm" variant="ghost" className="text-xs">
                  Leggi le FAQ
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOOTER NDW STANDARD ===== */}
      <footer className="border-t border-neutral-200 mt-12">
        <div className="mx-auto w-full max-w-6xl px-4 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center">
                <div className="h-3 w-3 rounded bg-primary/70" />
              </div>
              <div>
                <div className="text-xs font-medium text-neutral-700">NDW Hub • Centro di Controllo</div>
                <div className="text-[11px] text-neutral-500">Nota Digital Works • {new Date().getFullYear()}</div>
              </div>
            </div>
            
            <div className="text-xs text-neutral-500 flex items-center gap-4">
              <span className="hidden sm:inline">Sessione attiva</span>
              <span className="h-1 w-1 rounded-full bg-neutral-300"></span>
              <span>1 prodotto attivo</span>
              <span className="h-1 w-1 rounded-full bg-neutral-300"></span>
              <span className="text-primary font-medium">v1.0 • MVP</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

// ===== COMPONENTI =====

interface KpiCardProps {
  title: string;
  value: string;
  note: string;
  icon: React.ReactNode;
  color: 'primary' | 'emerald' | 'amber';
}

function KpiCard({ title, value, note, icon, color }: KpiCardProps) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
  };

  return (
    <Card className="rounded-2xl border border-neutral-200/80 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-sm font-medium text-neutral-600">
            {title}
          </CardTitle>
          <div className={`p-1.5 rounded-lg ${colorClasses[color]}`}>
            {icon}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tracking-tight">{value}</div>
        <div className="mt-1 text-xs text-neutral-500">{note}</div>
      </CardContent>
    </Card>
  );
}

interface ProductRowProps {
  name: string;
  badge: string;
  href: string;
  description?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

function ProductRow({ 
  name, 
  badge, 
  href, 
  description, 
  disabled, 
  icon 
}: ProductRowProps) {
  const row = (
    <div
      className={[
        "flex items-start gap-3 rounded-xl border bg-white p-3 transition-all",
        disabled ? "opacity-60" : "hover:border-primary hover:bg-neutral-50",
      ].join(" ")}
    >
      {icon && (
        <div className={`p-2 rounded-lg ${disabled ? 'bg-neutral-100' : 'bg-primary/10'}`}>
          <div className={disabled ? 'text-neutral-400' : 'text-primary'}>
            {icon}
          </div>
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-medium text-neutral-900">{name}</h3>
            {description && (
              <p className="text-sm text-neutral-600 mt-1">{description}</p>
            )}
          </div>
          <span className={[
            "rounded-full px-2.5 py-0.5 text-[11px] font-medium",
            disabled 
              ? "bg-neutral-100 text-neutral-500 border border-neutral-200" 
              : "bg-primary/10 text-primary border border-primary/20"
          ].join(" ")}>
            {badge}
          </span>
        </div>
      </div>
    </div>
  );

  if (disabled) return row;
  return <Link href={href}>{row}</Link>;
}