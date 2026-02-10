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

  // potrebbero non esistere ancora nel DB: gestiamo fallback safe
  warehouse_label?: string | null;
  warehouse_address?: string | null;
};

function maskKey(k: string) {
  const trimmed = k.trim();
  if (trimmed.length <= 8) return "********";
  return `${trimmed.slice(0, 4)}********${trimmed.slice(-4)}`;
}

function lsKeyWarehouse(userId: string) {
  return `ndw_routepro_warehouse_${userId}`;
}

function safeParseNumber(v: string, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

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

  // Warehouse settings (HUB)
  const [warehouseLabel, setWarehouseLabel] = useState("");
  const [warehouseAddress, setWarehouseAddress] = useState("");
  const [warehouseStorageMode, setWarehouseStorageMode] = useState<"db" | "local" | null>(null);

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

      // carico settings
      const { data, error } = await supabase
        .from("routepro_settings")
        .select(
          "ors_api_key, work_start_time, target_end_time, max_end_time, break_minutes, discontinuity_minutes, warehouse_label, warehouse_address"
        )
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

        // warehouse da DB (se presente)
        if (typeof row.warehouse_label === "string") setWarehouseLabel(row.warehouse_label ?? "");
        if (typeof row.warehouse_address === "string") setWarehouseAddress(row.warehouse_address ?? "");
      }

      // fallback localStorage (se DB non aveva valori o colonne non presenti)
      try {
        const raw = localStorage.getItem(lsKeyWarehouse(userData.user.id));
        if (raw) {
          const parsed = JSON.parse(raw);
          if (!warehouseLabel && typeof parsed?.label === "string") setWarehouseLabel(parsed.label);
          if (!warehouseAddress && typeof parsed?.address === "string") setWarehouseAddress(parsed.address);
        }
      } catch {
        // ignore
      }

      setChecking(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

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
        setMsg("Incolla una ORS API Key valida oppure usa “Rimuovi key”.");
        return;
      }

      const { error } = await supabase
        .from("routepro_settings")
        .upsert({ user_id: userData.user.id, ors_api_key: k }, { onConflict: "user_id" });

      if (error) throw error;

      setSavedKeyMasked(maskKey(k));
      setKeyValue("");
      setMsg("ORS Key salvata ✅ (ottimizzazione/ETA useranno la tua key)");
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

      const { error } = await supabase.from("routepro_settings").upsert(payload, { onConflict: "user_id" });
      if (error) throw error;

      setMsg("Orari salvati ✅ (Driver Mode userà queste info per il rientro)");
    } catch (e: any) {
      setMsg(e?.message ?? "Errore salvataggio orari.");
    } finally {
      setSaving(false);
    }
  }

  async function saveWarehouse() {
    setMsg(null);
    setSaving(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.replace("/login");
        return;
      }

      const label = warehouseLabel.trim();
      const address = warehouseAddress.trim();

      if (!address) {
        setMsg("Inserisci l’indirizzo del magazzino (HUB).");
        return;
      }

      // 1) Provo DB (se colonne esistono)
      const { error } = await supabase
        .from("routepro_settings")
        .upsert(
          {
            user_id: userData.user.id,
            warehouse_label: label || null,
            warehouse_address: address,
          } as any,
          { onConflict: "user_id" }
        );

      if (!error) {
        setWarehouseStorageMode("db");
        setMsg("Magazzino salvato ✅ (sincronizzato su account)");
        return;
      }

      // 2) Fallback localStorage (safe, non blocca l’utente)
      try {
        localStorage.setItem(lsKeyWarehouse(userData.user.id), JSON.stringify({ label, address }));
        setWarehouseStorageMode("local");
        setMsg(
          "Magazzino salvato ✅ (locale su questo device). Per sincronizzarlo su account serve aggiungere colonne warehouse_* nel DB."
        );
      } catch {
        // se persino localStorage fallisce, mostro errore DB
        throw error;
      }
    } catch (e: any) {
      setMsg(e?.message ?? "Errore salvataggio magazzino.");
    } finally {
      setSaving(false);
    }
  }

  async function removeWarehouse() {
    setMsg(null);
    setSaving(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.replace("/login");
        return;
      }

      // provo a pulire DB (se colonne esistono)
      const { error } = await supabase
        .from("routepro_settings")
        .upsert(
          { user_id: userData.user.id, warehouse_label: null, warehouse_address: null } as any,
          { onConflict: "user_id" }
        );

      // pulisco sempre local
      try {
        localStorage.removeItem(lsKeyWarehouse(userData.user.id));
      } catch {
        // ignore
      }

      setWarehouseLabel("");
      setWarehouseAddress("");
      setWarehouseStorageMode(error ? "local" : "db");
      setMsg("Magazzino rimosso ✅");
    } catch (e: any) {
      setMsg(e?.message ?? "Errore rimozione magazzino.");
    } finally {
      setSaving(false);
    }
  }

  if (checking) return <div className="p-4 text-sm text-neutral-600">Caricamento...</div>;

  return (
    <main className="min-h-dvh bg-neutral-50 text-neutral-900">
      <RouteProHeader title="RoutePro • Settings" tier={tier} />

      {/* più compatta su mobile */}
      <section className="mx-auto w-full max-w-md px-3 py-4 space-y-3">
        {/* ORS KEY */}
        <Card className="rounded-2xl">
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm">ORS API Key personale</CardTitle>
          </CardHeader>

          <CardContent className="p-3 pt-2 space-y-2 text-sm text-neutral-700">
            <div className="rounded-xl border bg-neutral-50 px-3 py-2 text-[12px] text-neutral-600">
              {savedKeyMasked ? (
                <>
                  Key salvata: <b>{savedKeyMasked}</b>
                </>
              ) : (
                <>Nessuna key salvata (fallback su key NDW).</>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[12px] font-medium text-neutral-700">Incolla ORS API Key</label>
              <Input
                value={keyValue}
                onChange={(e) => setKeyValue(e.target.value)}
                placeholder="5b3ce359..."
                className="h-10"
              />
            </div>

            {/* bottoni più “proporzionati” */}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={testKey} disabled={testing} className="h-9 text-sm">
                {testing ? "Test..." : "Test key"}
              </Button>
              <Button onClick={saveOrsKey} disabled={saving} className="h-9 text-sm">
                {saving ? "Salvo..." : "Salva key"}
              </Button>
              <Button
                variant="secondary"
                onClick={removeOrsKey}
                disabled={saving}
                className="h-9 text-sm col-span-2"
              >
                Rimuovi key
              </Button>
            </div>

            <div className="rounded-xl border bg-neutral-50 px-3 py-2 text-[11px] text-neutral-600">
              Come ottenerla: openrouteservice.org → account → API Keys → Create key → copia/incolla.
            </div>
          </CardContent>
        </Card>

        {/* MAGAZZINO (HUB) */}
        <Card className="rounded-2xl">
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm">Magazzino (HUB)</CardTitle>
          </CardHeader>

          <CardContent className="p-3 pt-2 space-y-2 text-sm text-neutral-700">
            <p className="text-[12px] text-neutral-600">
              Imposta il tuo HUB una volta sola: Driver Mode e funzioni di rientro potranno riutilizzarlo.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] text-neutral-600">Nome HUB (opz.)</label>
                <Input
                  value={warehouseLabel}
                  onChange={(e) => setWarehouseLabel(e.target.value)}
                  placeholder="MB01"
                  className="h-10"
                />
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-[11px] text-neutral-600">Indirizzo magazzino</label>
                <Input
                  value={warehouseAddress}
                  onChange={(e) => setWarehouseAddress(e.target.value)}
                  placeholder="Via dell’Industria 12, Pioltello (MI)"
                  className="h-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button onClick={saveWarehouse} disabled={saving} className="h-9 text-sm">
                {saving ? "Salvo..." : "Salva magazzino"}
              </Button>
              <Button variant="outline" onClick={removeWarehouse} disabled={saving} className="h-9 text-sm">
                Rimuovi
              </Button>
            </div>

            {warehouseStorageMode && (
              <div className="rounded-xl border bg-neutral-50 px-3 py-2 text-[11px] text-neutral-600">
                Salvataggio: <b>{warehouseStorageMode === "db" ? "Account" : "Questo device"}</b>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ORARI */}
        <Card className="rounded-2xl">
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm">Orari lavoro & rientro</CardTitle>
          </CardHeader>

          <CardContent className="p-3 pt-2 space-y-2 text-sm text-neutral-700">
            <p className="text-[12px] text-neutral-600">
              Driver Mode userà queste info per stimare se rientri in orario (stima, non garanzia).
            </p>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] text-neutral-600">Inizio lavoro</label>
                <Input type="time" value={workStart} onChange={(e) => setWorkStart(e.target.value)} className="h-10" />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-neutral-600">Target rientro</label>
                <Input type="time" value={targetEnd} onChange={(e) => setTargetEnd(e.target.value)} className="h-10" />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-neutral-600">Massimo rientro</label>
                <Input type="time" value={maxEnd} onChange={(e) => setMaxEnd(e.target.value)} className="h-10" />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-neutral-600">Pausa (min)</label>
                <Input
                  type="number"
                  value={breakMin}
                  onChange={(e) => setBreakMin(safeParseNumber(e.target.value || "0", 0))}
                  className="h-10"
                />
              </div>

              <div className="space-y-1 col-span-2">
                <label className="text-[11px] text-neutral-600">Discontinuità (min)</label>
                <Input
                  type="number"
                  value={discMin}
                  onChange={(e) => setDiscMin(safeParseNumber(e.target.value || "0", 0))}
                  className="h-10"
                />
              </div>
            </div>

            <Button onClick={saveWorkday} disabled={saving} className="h-9 text-sm w-full">
              {saving ? "Salvo..." : "Salva orari"}
            </Button>
          </CardContent>
        </Card>

        {/* MSG (una sola, compatta) */}
        {msg && (
          <div className="rounded-2xl border bg-white px-3 py-2 text-sm text-neutral-700">
            {msg}
          </div>
        )}
      </section>
    </main>
  );
}
