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

type SettingsRow = {
  ors_api_key: string | null;

  work_start_time: string | null;
  target_end_time: string | null;
  max_end_time: string | null;
  break_minutes: number | null;
  discontinuity_minutes: number | null;
};

export default function RouteProSettingsPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [tier, setTier] = useState<string>("STARTER");

  const [keyValue, setKeyValue] = useState("");
  const [savedKeyMasked, setSavedKeyMasked] = useState<string | null>(null);

  // Workday settings
  const [workStart, setWorkStart] = useState("09:10");
  const [targetEnd, setTargetEnd] = useState("17:45");
  const [maxEnd, setMaxEnd] = useState("18:04");
  const [breakMin, setBreakMin] = useState(30);
  const [discMin, setDiscMin] = useState(28);

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
        .select("ors_api_key, work_start_time, target_end_time, max_end_time, break_minutes, discontinuity_minutes")
        .eq("user_id", userData.user.id)
        .maybeSingle();

      if (!error && data) {
        const row = data as any as SettingsRow;

        if (row.ors_api_key) setSavedKeyMasked(maskKey(String(row.ors_api_key)));
        else setSavedKeyMasked(null);

        setWorkStart(row.work_start_time ?? "09:10");
        setTargetEnd(row.target_end_time ?? "17:45");
        setMaxEnd(row.max_end_time ?? "18:04");
        setBreakMin(row.break_minutes ?? 30);
        setDiscMin(row.discontinuity_minutes ?? 28);
      }

      setChecking(false);
    })();
  }, [router]);

  function maskKey(k: string) {
    const trimmed = k.trim();
    if (trimmed.length <= 8) return "********";
    return `${trimmed.slice(0, 4)}********${trimmed.slice(-4)}`;
  }

  async function saveOrsKey() {
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

  async function removeOrsKey() {
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

  async function saveWorkday() {
    setMsg(null);
    setSaving(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.replace("/login");
        return;
      }

      const payload = {
        user_id: userData.user.id,
        work_start_time: workStart,
        target_end_time: targetEnd,
        max_end_time: maxEnd,
        break_minutes: breakMin,
        discontinuity_minutes: discMin,
      };

      const { error } = await supabase
        .from("routepro_settings")
        .upsert(payload, { onConflict: "user_id" });

      if (error) throw error;

      setMsg("Orari salvati ✅ (Driver Mode userà queste info per il rientro)");
    } catch (e: any) {
      setMsg(e?.message ?? "Errore salvataggio orari.");
    } finally {
      setSaving(false);
    }
  }

  if (checking) return <div className="p-4 text-sm text-neutral-600">Caricamento...</div>;

  return (
    <main className="min-h-dvh bg-white text-neutral-900">
      <RouteProHeader title="RoutePro • Settings" tier={tier} />

      <section className="mx-auto w-full max-w-3xl px-4 py-8 space-y-4">
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
            <Input value={keyValue} onChange={(e) => setKeyValue(e.target.value)} placeholder="5b3ce359..." />

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" onClick={testKey} disabled={testing}>
                {testing ? "Test..." : "Test key"}
              </Button>
              <Button onClick={saveOrsKey} disabled={saving}>
                {saving ? "Salvo..." : "Salva key"}
              </Button>
              <Button variant="secondary" onClick={removeOrsKey} disabled={saving}>
                Rimuovi key
              </Button>
            </div>

            <div className="rounded-2xl border bg-neutral-50 p-3 text-xs text-neutral-600">
              Come ottenerla: openrouteservice.org → account → API Keys → Create key → copia/incolla.
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Orari lavoro & rientro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-neutral-700">
            <p className="text-sm text-neutral-600">
              Driver Mode userà queste info per stimare se rientri in orario (stima, non garanzia).
            </p>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs text-neutral-600">Inizio lavoro</label>
                <Input type="time" value={workStart} onChange={(e) => setWorkStart(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-neutral-600">Target rientro</label>
                <Input type="time" value={targetEnd} onChange={(e) => setTargetEnd(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-neutral-600">Massimo rientro</label>
                <Input type="time" value={maxEnd} onChange={(e) => setMaxEnd(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-neutral-600">Pausa (min)</label>
                <Input type="number" value={breakMin} onChange={(e) => setBreakMin(Number(e.target.value || 0))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-neutral-600">Discontinuità (min)</label>
                <Input type="number" value={discMin} onChange={(e) => setDiscMin(Number(e.target.value || 0))} />
              </div>
            </div>

            <Button onClick={saveWorkday} disabled={saving}>
              {saving ? "Salvo..." : "Salva orari"}
            </Button>

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
