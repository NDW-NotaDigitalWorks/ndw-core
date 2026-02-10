"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { routeProPath } from "@/lib/routepro/routeProPath";
import { supabase } from "@/lib/supabaseClient";

export default function ImportTextAnalyzePage() {
  const router = useRouter();

  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // piccolo “marker” per capire al volo se stai vedendo questa versione
  const UI_BUILD_MARK = "UI:v3-debug";

  const canSubmit = useMemo(() => text.trim().length >= 20, [text]);

  async function onCreateRoute() {
    setErr(null);

    if (!canSubmit) {
      setErr("Incolla prima il testo (almeno qualche riga).");
      return;
    }

    setLoading(true);

    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token || null;

      if (!token) {
        router.push("/login");
        return;
      }

      const res = await fetch("/api/routepro/import/text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rawText: text }),
      });

      const rawText = await res.text();
      let data: any = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        data = { _raw: rawText };
      }

      if (!res.ok) {
        // 👇 QUI NON PUÒ ESSERE GENERICO: stampiamo tutto.
        const msg = [
          `${UI_BUILD_MARK}`,
          `HTTP ${res.status} ${res.statusText}`,
          data?.error ? `error: ${data.error}` : null,
          data?.detail ? `detail: ${data.detail}` : null,
          data?.traceId ? `traceId: ${data.traceId}` : null,
          `body: ${JSON.stringify(data, null, 2)}`,
        ]
          .filter(Boolean)
          .join("\n");

        throw new Error(msg);
      }

      const routeId = data?.routeId as string | undefined;
      if (!routeId) {
        throw new Error(
          `${UI_BUILD_MARK}\nRisposta OK ma routeId mancante.\nbody: ${JSON.stringify(data, null, 2)}`
        );
      }

      router.push(routeProPath(`/routes/${routeId}/driver`));
    } catch (e: any) {
      setErr(e?.message ?? "Errore");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh bg-neutral-50 p-3">
      <div className="mx-auto max-w-md space-y-3">
        {/* TOP BAR */}
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">RoutePro • Import</div>
          <LogoutButton />
        </div>

        <Card className="rounded-2xl">
          <CardContent className="p-4 space-y-3">
            <div className="text-sm font-semibold">Incolla testo (OCR / Flex)</div>
            <div className="text-xs text-neutral-500">
              Incolla qui l’elenco stop. Poi premi “Crea rotta”.
            </div>

            <textarea
              className="min-h-[220px] w-full rounded-xl border bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-neutral-200"
              placeholder="Incolla qui..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />

            {err && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 whitespace-pre-wrap">
                {err}
              </div>
            )}

            <Button className="w-full" onClick={onCreateRoute} disabled={!canSubmit || loading} type="button">
              {loading ? "Creo rotta..." : "✅ Crea rotta"}
            </Button>

            <Button variant="outline" className="w-full" onClick={() => router.push(routeProPath("/import/text"))} type="button">
              ← Indietro
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
