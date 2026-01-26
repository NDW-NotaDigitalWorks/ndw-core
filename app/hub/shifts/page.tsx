// app/hub/shifts/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type ShiftRow = {
  id: string;
  shift_date: string; // YYYY-MM-DD
  start_time: string | null; // HH:MM:SS
  end_time: string | null;
  title: string;
  notes: string | null;
  created_at: string;
};

function todayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function ShiftsPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ShiftRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  // form
  const [shiftDate, setShiftDate] = useState(todayISO());
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [title, setTitle] = useState("Turno");
  const [notes, setNotes] = useState("");

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => (a.shift_date < b.shift_date ? 1 : -1));
  }, [items]);

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
      .from("shifts")
      .select("id,shift_date,start_time,end_time,title,notes,created_at")
      .order("shift_date", { ascending: false })
      .limit(50);

    if (error) setMsg(error.message);
    setItems((data as any) ?? []);
    setLoading(false);
  }

  async function addShift() {
    setMsg(null);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      router.replace("/login");
      return;
    }

    const payload = {
      user_id: userData.user.id,
      shift_date: shiftDate,
      start_time: startTime ? `${startTime}:00` : null,
      end_time: endTime ? `${endTime}:00` : null,
      title: title.trim() || "Turno",
      notes: notes.trim() || null,
    };

    const { error } = await supabase.from("shifts").insert(payload);
    if (error) {
      setMsg(error.message);
      return;
    }

    setMsg("Turno salvato ✅");
    setNotes("");
    await load();
  }

  async function deleteShift(id: string) {
    setMsg(null);
    const { error } = await supabase.from("shifts").delete().eq("id", id);
    if (error) setMsg(error.message);
    else {
      setMsg("Turno eliminato ✅");
      await load();
    }
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
              <span className="text-sm font-semibold tracking-tight">NDW • Turni</span>
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
              <CardTitle className="text-base">Nuovo turno</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-neutral-600">Data</label>
                  <Input type="date" value={shiftDate} onChange={(e) => setShiftDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-neutral-600">Titolo</label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Turno" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-neutral-600">Inizio</label>
                  <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-neutral-600">Fine</label>
                  <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-neutral-600">Note</label>
                <textarea
                  className="min-h-[110px] w-full resize-y rounded-2xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Es. deposito Burago, zona Monza, note operative..."
                />
              </div>

              <Button className="w-full" onClick={addShift}>
                Salva turno
              </Button>

              {msg && (
                <div className="rounded-2xl border bg-neutral-50 p-3 text-sm text-neutral-700">
                  {msg}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">I tuoi turni</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {sorted.length === 0 ? (
                <div className="text-sm text-neutral-600">Nessun turno ancora.</div>
              ) : (
                <div className="divide-y rounded-2xl border">
                  {sorted.map((s) => (
                    <div key={s.id} className="flex items-start justify-between gap-4 px-4 py-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium">
                          {s.shift_date} • {s.title}
                        </div>
                        <div className="mt-1 text-xs text-neutral-500">
                          {s.start_time ? s.start_time.slice(0, 5) : "—"} →{" "}
                          {s.end_time ? s.end_time.slice(0, 5) : "—"}
                        </div>
                        {s.notes && (
                          <div className="mt-2 text-xs text-neutral-600 line-clamp-3">
                            {s.notes}
                          </div>
                        )}
                      </div>

                      <Button variant="outline" onClick={() => deleteShift(s.id)}>
                        Elimina
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 rounded-2xl border bg-neutral-50 p-3 text-xs text-neutral-600">
                Questo modulo è universale NDW: utile per driver, ristorazione e beauty.
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
