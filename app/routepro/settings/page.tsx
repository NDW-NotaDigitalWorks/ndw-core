// app/routepro/settings/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { hasRouteProAccess, getRouteProTier } from "@/lib/entitlement";
import { RouteProHeader } from "@/components/routepro/RouteProHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function RouteProSettingsPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [tier, setTier] = useState<string>("STARTER");

  const [keyValue, setKeyValue] = useState("");
  const [savedKeyMasked, setSavedKeyMasked] = useState<string | null>(null);

  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.replace("/login");
        return;
      }

      const allowed = await hasRouteProAccess();
      if (!allowed) {
        router.replace("/hub?upgrade=routepro");
        return;
      }

      const t = await getRouteProTier();
      setTier((t ?? "starter").toUpperCase());

      const { data, error } = await supabase
        .from("routepro_settings")
        .select("ors_api_key")
        .eq("user_id", userData.user.id)
        .maybeSingle();

      if (!error && data?.ors_api_key) {
        setSavedKeyMasked(maskKey(String(data.ors_api_key)));
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

      const { error } = await supabase.from("routepro_settings").upsert(
        { user_id: userData.user.id, ors_api_key: k },
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
      setMsg("ORS Key rimossa ✅ (fallback su key NDW)");
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
    return <div className="p-4 text-sm text-neutral-600">Caricamento...</div>;
  }

  return (
    <main className="min-h-dvh bg-white text-neutral-900">
      <RouteProHeader title="RoutePro • Settings" tier={tier} />

      <section className="mx-auto w-full max-w-3xl px-4 py-8">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">ORS API Key personale</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-neutral-700">
            <div className="rounded-2xl border bg-neutral-50 p-3 text-xs text-neutral-600">
              {savedKeyMasked
                ? <>Key salvata: <b>{savedKeyMasked}</b></>
                : <>Nessuna key salvata (fallback su key NDW).</>}
            </div>

            <label className="text-sm font-medium">Incolla ORS API Key</label>
            <Input
              value={keyValue}
              onChange={(e) => setKeyValue(e.target.value)}
              placeholder="5b3ce3597851110001cf6248..."
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

            <div className="rounded-2xl border bg-neutral-50 p-3 text-xs text-neutral-600">
              Come ottenerla: openrouteservice.org → account → API Keys → Create key → copia/incolla.
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
