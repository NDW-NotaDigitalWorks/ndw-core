// app/hub/checklists/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type ChecklistRow = {
  id: string;
  title: string;
  created_at: string;
};

type ItemRow = {
  id: string;
  checklist_id: string;
  label: string;
  is_done: boolean;
  position: number;
};

export default function ChecklistsPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  const [msg, setMsg] = useState<string | null>(null);

  const [lists, setLists] = useState<ChecklistRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(
    () => lists.find((l) => l.id === selectedId) ?? null,
    [lists, selectedId]
  );

  const [items, setItems] = useState<ItemRow[]>([]);
  const orderedItems = useMemo(
    () => [...items].sort((a, b) => a.position - b.position),
    [items]
  );

  // create checklist
  const [newTitle, setNewTitle] = useState("Checklist");

  // add item
  const [newItem, setNewItem] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/login");
        return;
      }
      setEmail(data.user.email ?? null);
      setChecking(false);
      await loadLists();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function loadLists() {
    setMsg(null);
    const { data, error } = await supabase
      .from("checklists")
      .select("id,title,created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      setMsg(error.message);
      return;
    }

    const rows = (data as any as ChecklistRow[]) ?? [];
    setLists(rows);

    // auto-select first list
    if (!selectedId && rows[0]) {
      setSelectedId(rows[0].id);
      await loadItems(rows[0].id);
    } else if (selectedId) {
      // refresh items for current
      await loadItems(selectedId);
    }
  }

  async function loadItems(checklistId: string) {
    const { data, error } = await supabase
      .from("checklist_items")
      .select("id,checklist_id,label,is_done,position")
      .eq("checklist_id", checklistId)
      .order("position", { ascending: true })
      .limit(200);

    if (error) {
      setMsg(error.message);
      return;
    }

    setItems((data as any as ItemRow[]) ?? []);
  }

  async function createChecklist() {
    setMsg(null);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      router.replace("/login");
      return;
    }

    const title = newTitle.trim() || "Checklist";
    const { data, error } = await supabase
      .from("checklists")
      .insert({ user_id: userData.user.id, title })
      .select("id,title,created_at")
      .single();

    if (error) {
      setMsg(error.message);
      return;
    }

    setMsg("Checklist creata ✅");
    await loadLists();
    if (data?.id) {
      setSelectedId(data.id);
      await loadItems(data.id);
    }
  }

  async function addItem() {
    if (!selectedId) {
      setMsg("Seleziona una checklist.");
      return;
    }

    const label = newItem.trim();
    if (!label) return;

    const nextPos = (orderedItems.at(-1)?.position ?? 0) + 1;

    const { error } = await supabase.from("checklist_items").insert({
      checklist_id: selectedId,
      label,
      is_done: false,
      position: nextPos,
    });

    if (error) {
      setMsg(error.message);
      return;
    }

    setNewItem("");
    await loadItems(selectedId);
  }

  async function toggleItem(item: ItemRow) {
    const { error } = await supabase
      .from("checklist_items")
      .update({ is_done: !item.is_done })
      .eq("id", item.id);

    if (error) setMsg(error.message);
    else if (selectedId) await loadItems(selectedId);
  }

  async function resetChecklist() {
    if (!selectedId) return;

    const { error } = await supabase
      .from("checklist_items")
      .update({ is_done: false })
      .eq("checklist_id", selectedId);

    if (error) setMsg(error.message);
    else {
      setMsg("Checklist resettata ✅");
      await loadItems(selectedId);
    }
  }

  async function deleteChecklist() {
    if (!selectedId) return;
    const { error } = await supabase.from("checklists").delete().eq("id", selectedId);
    if (error) setMsg(error.message);
    else {
      setMsg("Checklist eliminata ✅");
      setSelectedId(null);
      setItems([]);
      await loadLists();
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
              <span className="text-sm font-semibold tracking-tight">NDW • Checklist</span>
              {email && <span className="text-[11px] text-neutral-500">{email}</span>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/hub">
              <Button variant="ghost">Hub</Button>
            </Link>
            <Button variant="secondary" onClick={loadLists}>
              Aggiorna
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-5xl px-4 py-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Le tue checklist</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Es. Pre-turno" />
                <Button onClick={createChecklist}>Crea</Button>
              </div>

              {lists.length === 0 ? (
                <div className="text-sm text-neutral-600">Nessuna checklist.</div>
              ) : (
                <div className="divide-y rounded-2xl border">
                  {lists.map((l) => (
                    <button
                      key={l.id}
                      onClick={async () => {
                        setSelectedId(l.id);
                        await loadItems(l.id);
                      }}
                      className={[
                        "w-full px-4 py-3 text-left hover:bg-neutral-50",
                        l.id === selectedId ? "bg-neutral-50" : "",
                      ].join(" ")}
                    >
                      <div className="text-sm font-medium">{l.title}</div>
                      <div className="mt-1 text-xs text-neutral-500">{l.created_at.slice(0, 10)}</div>
                    </button>
                  ))}
                </div>
              )}

              {msg && (
                <div className="rounded-2xl border bg-neutral-50 p-3 text-sm text-neutral-700">
                  {msg}
                </div>
              )}

              <div className="rounded-2xl border bg-neutral-50 p-3 text-xs text-neutral-600">
                Modulo universale NDW (driver, ristorazione, beauty).
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle className="text-base">
                {selected ? selected.title : "Seleziona una checklist"}
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" onClick={resetChecklist} disabled={!selectedId}>
                  Reset
                </Button>
                <Button variant="outline" onClick={deleteChecklist} disabled={!selectedId}>
                  Elimina
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  placeholder="Aggiungi voce..."
                  disabled={!selectedId}
                />
                <Button onClick={addItem} disabled={!selectedId}>
                  +
                </Button>
              </div>

              {selectedId && orderedItems.length === 0 ? (
                <div className="text-sm text-neutral-600">Nessuna voce. Aggiungine una.</div>
              ) : null}

              {selectedId && orderedItems.length > 0 ? (
                <div className="divide-y rounded-2xl border">
                  {orderedItems.map((it) => (
                    <button
                      key={it.id}
                      onClick={() => toggleItem(it)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-neutral-50"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium">
                          {it.is_done ? "✅ " : "⬜ "} {it.label}
                        </div>
                      </div>
                      <span className="rounded-full border bg-neutral-50 px-2 py-0.5 text-[11px] text-neutral-600">
                        {it.is_done ? "Fatto" : "Da fare"}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
