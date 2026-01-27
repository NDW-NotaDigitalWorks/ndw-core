// app/page.tsx
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="min-h-dvh bg-white text-neutral-900">
      <header className="sticky top-0 z-10 border-b bg-[#050B1E]/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3 text-white">
          <div className="flex items-center gap-3">
            <Image src="/ndw-logo.png" alt="NDW" width={36} height={36} priority />
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-tight">NDW</span>
              <span className="text-[11px] text-sky-300">Nota Digital Works</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/hub">
              <Button className="bg-sky-500 text-white hover:bg-sky-400">NDW Hub</Button>
            </Link>
            <Link href="/routepro/start">
              <Button variant="outline" className="border-sky-400 text-sky-300 hover:bg-sky-400/10">
                RoutePro
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-5xl px-4 py-10 sm:py-16">
        <div className="grid gap-8 sm:grid-cols-2 sm:items-center">
          <div className="space-y-4">
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
              Platform • Tools • Automazioni
            </p>

            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Tool premium che fanno risparmiare tempo e aumentano il guadagno.
            </h1>

            <p className="text-base leading-relaxed text-neutral-600">
              NDW è la piattaforma madre: dashboard operativa + moduli verticali.
              Primo modulo: RoutePro per driver.
            </p>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Link href="/routepro/start">
                <Button className="w-full sm:w-auto">Scopri RoutePro</Button>
              </Link>
              <Link href="/hub">
                <Button variant="outline" className="w-full sm:w-auto">
                  Entra in NDW Hub
                </Button>
              </Link>
            </div>
          </div>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">NDW Core (oggi)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-neutral-600">
              <div className="rounded-xl border bg-neutral-50 p-3">Turni</div>
              <div className="rounded-xl border bg-neutral-50 p-3">Schede lavoro</div>
              <div className="rounded-xl border bg-neutral-50 p-3">Checklist</div>
              <div className="rounded-xl border bg-neutral-50 p-3">RoutePro (Driver Mode)</div>
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto w-full max-w-5xl px-4 py-8 text-xs text-neutral-500">
          © {new Date().getFullYear()} NDW — Nota Digital Works
        </div>
      </footer>
    </main>
  );
}
