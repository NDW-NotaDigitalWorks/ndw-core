// app/login/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function isSafeNext(next: string | null): next is string {
  if (!next) return false;
  if (!next.startsWith("/")) return false;
  if (next.startsWith("//")) return false;
  return true;
}

function getNextFromLocation(): string {
  if (typeof window === "undefined") return "/routepro";
  try {
    const params = new URLSearchParams(window.location.search);
    const n = params.get("next");
    return isSafeNext(n) ? n : "/routepro";
  } catch {
    return "/routepro";
  }
}

export default function LoginPage() {
  const router = useRouter();

  const next = useMemo(() => getNextFromLocation(), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // If user already has a session -> go to RoutePro (avoid /hub which may not exist)
  useEffect(() => {
    let alive = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!alive) return;
      if (data.session) router.replace(next);
    })();

    return () => {
      alive = false;
    };
  }, [router, next]);

  async function onLogin() {
    setMessage(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      router.push(next);
    } finally {
      setLoading(false);
    }
  }

  async function onSignup() {
    setMessage(null);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      if (data.session) {
        router.push(next);
      } else {
        setMessage("Account creato ✅ Controlla la tua email per confermare, poi fai login.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh bg-white text-neutral-900">
      <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-2xl border bg-neutral-50" />
            <span className="text-sm font-semibold tracking-tight">NDW — Login</span>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/routepro" className="hidden sm:block">
              <Button variant="ghost">RoutePro</Button>
            </Link>
            <Link href="/">
              <Button variant="ghost">Home</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-5xl px-4 py-10">
        <div className="mx-auto max-w-md">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Accedi a NDW</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  placeholder="nome@dominio.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Password</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Button onClick={onLogin} disabled={loading || !email.trim() || !password}>
                  {loading ? "Attendi..." : "Accedi"}
                </Button>
                <Button variant="outline" onClick={onSignup} disabled={loading || !email.trim() || !password}>
                  {loading ? "Attendi..." : "Crea account"}
                </Button>
              </div>

              {message && (
                <div className="rounded-xl border bg-neutral-50 p-3 text-sm text-neutral-700">
                  {message}
                </div>
              )}

              <p className="text-xs text-neutral-500">
                Dopo il login verrai reindirizzato a: <b>{next}</b>
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
