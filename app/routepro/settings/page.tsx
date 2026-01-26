// app/routepro/settings/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { hasActiveEntitlement } from "@/lib/entitlement";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function RouteProSettingsPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [keyValue, setKeyValue] = useState("");
  const [savedKeyMasked, setSavedKeyMasked] = useState<string | null>(null);

  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    (async () => {
      // login
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.replace("/login");
        return;
      }

      // entitlement gate (RoutePro users only)
      const allowed = await hasActiveEntitlement("routepro-starter");
      if (!allowed) {
        router.replace("/hub?upgrade=routepro");
        return;
      }

      // load saved key (masked)
      const { data, error } = await supabase
        .from("routepro_settings")
        .select("ors_api_key")
        .eq("user_id", userData.user.id)
        .maybeSingle();

      if (!error && data?.ors_api_key) {
        const k = String(data.ors_api_key);
        setSavedKeyMasked(maskKey(k));
      } else {
        setSavedKeyMasked(null);
      }

      setChecking(false);
    })();
  }, [router]);

  function maskKey(k: string) {
    const trimmed = k.trim();
    if (trimmed.length <= 8) return "********";
    return `${trimmed.slice(0, 4)}********${trimmed.slice(-4)}`;
  }

  async function saveKey() {
    setMsg(null);
    setSaving(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.replace("/login");
        return;
      }

      const k = keyValue.trim();
      if (!k) {
        setMsg("Incolla una ORS API Key valida oppure usa 'Rimuovi key'.");
        return;
      }

      // upsert settings
      const { error } = await supabase.from("routepro_settings").upsert(
        {
          user_id: userData.user.id,
          ors_api_key: k,
        },
        { onConflict: "user_id" }
      );

      if (error) throw error;

      setSavedKeyMasked(maskKey(k));
      setKeyValue("");
      setMsg("ORS Key salvata ✅ (ora l’ottimizzazione userà la tua key)");
    } catch (e: any) {
      setMsg(e?.message ?? "Errore salvataggio.");
    } finally {
      setSaving(false);
    }
  }

  async function removeKey() {
    setMsg(null);
    setSaving(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.replace("/login");
        return;
      }

      const { error } = await supabase
        .from("routepro_settings")
        .upsert({ user_id: userData.user.id, ors_api_key: null }, { onConflict: "user_id" });

      if (error) throw error;

      setSavedKeyMasked(null);
      setMsg("ORS Key rimossa ✅ (torni a usare la key NDW come fallback)");
    } catch (e: any) {
      setMsg(e?.message ?? "Errore rimozione.");
    } finally {
      setSaving(false);
    }
  }

  async function testKey() {
    setMsg(null);
    setTesting(true);

    try {
      const k = keyValue.trim();
      if (!k) {
        setMsg("Incolla la key nel campo prima di testarla.");
        return;
      }

      // quick test: geocode a simple address using ORS
      const url = new URL("https://api.openrouteservice.org/geocode/search");
      url.searchParams.set("api_key", k);
      url.searchParams.set("text", "Milano");
      url.searchParams.set("size", "1");

      const res = await fetch(url.toString(), { method: "GET" });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Test fallito: ${res.status} ${t}`);
      }

      setMsg("Test OK ✅ Key valida.");
    } catch (e: any) {
      setMsg(e?.message ?? "Test fallito.");
    } finally {
      setTesting(false);
    }
  }

  if (checking) {
    return (
      <main className="min-h-dvh bg-white text-neutral-900">
        <div className="mx-auto w-full max-w-3xl px-4 py-10 text-sm text-neutral-600">
          Caricamento...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-white text-neutral-900">
      <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-2xl border bg-neutral-50" />
            <span className="text-sm font-semibold tracking-tight">
              RoutePro • Settings
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/routepro">
              <Button variant="ghost">Le mie rotte</Button>
            </Link>
            <Link href="/hub">
              <Button variant="ghost">NDW Hub</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-3xl px-4 py-8">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">ORS API Key personale</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-neutral-700">
            <p>
              Se inserisci la tua ORS key, l’ottimizzazione userà la tua quota.
              Se non la inserisci, RoutePro userà la key NDW (fallback).
            </p>

            <div className="rounded-2xl border bg-neutral-50 p-3 text-xs text-neutral-600">
              {savedKeyMasked
                ? <>Key salvata: <b>{savedKeyMasked}</b></>
                : <>Nessuna key salvata (stai usando la key NDW).</>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Incolla ORS API Key</label>
              <Input
                value={keyValue}
                onChange={(e) => setKeyValue(e.target.value)}
                placeholder="es. 5b3ce3597851110001cf6248..."
              />
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button variant="outline" onClick={testKey} disabled={testing}>
                  {testing ? "Test..." : "Test key"}
                </Button>
                <Button onClick={saveKey} disabled={saving}>
                  {saving ? "Salvo..." : "Salva key"}
                </Button>
                <Button variant="secondary" onClick={removeKey} disabled={saving}>
                  Rimuovi key
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border bg-neutral-50 p-3 text-xs text-neutral-600">
              Come ottenere la key:
              <ol className="mt-2 list-decimal pl-5">
                <li>Vai su openrouteservice.org</li>
                <li>Crea account (gratis)</li>
                <li>Dashboard → API Keys → Create key</li>
                <li>Copia e incolla qui</li>
              </ol>
            </div>

            {msg && (
              <div className="rounded-2xl border bg-neutral-50 p-3 text-sm text-neutral-700">
                {msg}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
