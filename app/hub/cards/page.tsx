// app/hub/cards/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type WorkCardRow = {
  id: string;
  title: string;
  details: string | null;
  tags: string[];
  status: "open" | "done";
  created_at: string;
};

function parseTags(input: string): string[] {
  return input
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 10);
}

export default function WorkCardsPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<WorkCardRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  // form
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [tagsInput, setTagsInput] = useState("Driver, Zona");

  // filter
  const [filter, setFilter] = useState<"all" | "open" | "done">("all");

  const filtered = useMemo(() => {
    const list = [...items].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    if (filter === "all") return list;
    return list.filter((c) => c.status === filter);
  }, [items, filter]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/login");
        return;
      }
      setEmail(data.user.email ?? null);
      setChecking(false);
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function load() {
    setLoading(true);
    setMsg(null);

    const { data, error } = await supabase
      .from("work_cards")
      .select("id,title,details,tags,status,created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) setMsg(error.message);
    setItems((data as any) ?? []);
    setLoading(false);
  }

  async function addCard() {
    setMsg(null);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      router.replace("/login");
      return;
    }

    const payload = {
      user_id: userData.user.id,
      title: title.trim(),
      details: details.trim() || null,
      tags: parseTags(tagsInput),
      status: "open",
    };

    if (!payload.title) {
      setMsg("Inserisci un titolo.");
      return;
    }

    const { error } = await supabase.from("work_cards").insert(payload);
    if (error) {
      setMsg(error.message);
      return;
    }

    setTitle("");
    setDetails("");
    setMsg("Scheda creata ✅");
    await load();
  }

  async function toggleDone(id: string, next: "open" | "done") {
    setMsg(null);
    const { error } = await supabase.from("work_cards").update({ status: next }).eq("id", id);
    if (error) setMsg(error.message);
    else await load();
  }

  async function deleteCard(id: string) {
    setMsg(null);
    const { error } = await supabase.from("work_cards").delete().eq("id", id);
    if (error) setMsg(error.message);
    else await load();
  }

  if (checking) {
    return (
      <main className="min-h-dvh bg-white text-neutral-900">
        <div className="mx-auto w-full max-w-5xl px-4 py-10 text-sm text-neutral-600">
          Caricamento...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-white text-neutral-900">
      <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-2xl border bg-neutral-50" />
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight">NDW • Schede</span>
              {email && <span className="text-[11px] text-neutral-500">{email}</span>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/hub">
              <Button variant="ghost">Hub</Button>
            </Link>
            <Button variant="secondary" onClick={load} disabled={loading}>
              {loading ? "..." : "Aggiorna"}
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-5xl px-4 py-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Nuova scheda</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-neutral-600">Titolo</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Es. Ritiro deposito Burago" />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-neutral-600">Tag (separati da virgola)</label>
                <Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="Driver, Zona, Urgente" />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-neutral-600">Dettagli</label>
                <textarea
                  className="min-h-[130px] w-full resize-y rounded-2xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Note operative, indirizzi, contatti, promemoria..."
                />
              </div>

              <Button className="w-full" onClick={addCard}>
                Crea scheda
              </Button>

              {msg && (
                <div className="rounded-2xl border bg-neutral-50 p-3 text-sm text-neutral-700">
                  {msg}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle className="text-base">Le tue schede</CardTitle>
              <div className="flex gap-2">
                <Button variant={filter === "all" ? "secondary" : "outline"} onClick={() => setFilter("all")}>
                  Tutte
                </Button>
                <Button variant={filter === "open" ? "secondary" : "outline"} onClick={() => setFilter("open")}>
                  Aperte
                </Button>
                <Button variant={filter === "done" ? "secondary" : "outline"} onClick={() => setFilter("done")}>
                  Fatte
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {filtered.length === 0 ? (
                <div className="text-sm text-neutral-600">Nessuna scheda.</div>
              ) : (
                <div className="space-y-3">
                  {filtered.map((c) => (
                    <div key={c.id} className="rounded-2xl border bg-white p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold">{c.title}</div>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {c.tags.map((t) => (
                              <span key={t} className="rounded-full border bg-neutral-50 px-2 py-0.5 text-[11px] text-neutral-600">
                                {t}
                              </span>
                            ))}
                            <span className="rounded-full border bg-neutral-50 px-2 py-0.5 text-[11px] text-neutral-600">
                              {c.status === "open" ? "Aperta" : "Fatta ✅"}
                            </span>
                          </div>
                          {c.details && (
                            <div className="mt-2 text-xs text-neutral-600 whitespace-pre-wrap">
                              {c.details}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2">
                          <Button
                            variant={c.status === "open" ? "outline" : "secondary"}
                            onClick={() => toggleDone(c.id, c.status === "open" ? "done" : "open")}
                          >
                            {c.status === "open" ? "Segna fatta" : "Riapri"}
                          </Button>
                          <Button variant="outline" onClick={() => deleteCard(c.id)}>
                            Elimina
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 rounded-2xl border bg-neutral-50 p-3 text-xs text-neutral-600">
                Modulo universale NDW: utile per driver, ristorazione e beauty.
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
