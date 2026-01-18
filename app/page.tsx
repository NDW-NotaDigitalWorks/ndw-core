// src/app/page.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="min-h-dvh bg-white text-neutral-900">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl border bg-neutral-50" />
            <span className="text-sm font-semibold tracking-tight">
              NDW — Nota Digital Works
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" className="hidden sm:inline-flex">
              Prodotti
            </Button>
            <Button variant="ghost" className="hidden sm:inline-flex">
              Prezzi
            </Button>
            <Button>Accedi</Button>
          </div>
        </div>
      </header>

      {/* Hero */}
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
              NDW è la piattaforma madre per prodotti reali: workflow chiari,
              KPI, automazioni e un ecosistema che abilita opportunità tra chi
              lavora.
            </p>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button className="w-full sm:w-auto">Scopri RoutePro</Button>
              <Button variant="outline" className="w-full sm:w-auto">
                Entra in NDW Hub
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-4">
              <MiniKpi label="Tempo" value="-30%" />
              <MiniKpi label="Errori" value="-40%" />
              <MiniKpi label="ROI" value="+↑" />
            </div>
          </div>

          {/* Preview card */}
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">NDW Hub (preview)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl border bg-neutral-50 p-4">
                <div className="text-sm font-medium">Prodotti attivi</div>
                <div className="mt-2 grid gap-2">
                  <ProductRow name="RoutePro" badge="MVP" />
                  <ProductRow name="Ristorazione" badge="In arrivo" />
                  <ProductRow name="Beauty" badge="In arrivo" />
                </div>
              </div>

              <div className="rounded-xl border p-4">
                <div className="text-sm font-medium">Azioni rapide</div>
                <div className="mt-3 flex flex-col gap-2">
                  <Button variant="secondary" className="justify-start">
                    Apri RoutePro
                  </Button>
                  <Button variant="outline" className="justify-start">
                    Upgrade piano
                  </Button>
                </div>
              </div>

              <p className="text-xs text-neutral-500">
                Questo è il nostro stile base NDW: pulito, coerente, mobile-first.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Value props */}
      <section className="border-t bg-neutral-50">
        <div className="mx-auto w-full max-w-5xl px-4 py-10">
          <div className="grid gap-4 sm:grid-cols-3">
            <ValueCard
              title="Workflow chiari"
              desc="Passi guidati, meno errori, più velocità operativa."
            />
            <ValueCard
              title="Automazioni utili"
              desc="Notifiche, report, template, export: cose che ti liberano tempo."
            />
            <ValueCard
              title="Multi-prodotto"
              desc="Un account NDW, più app. Stesso look & feel, stessi accessi."
            />
          </div>
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

function MiniKpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white p-3">
      <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function ProductRow({ name, badge }: { name: string; badge: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-white px-3 py-2">
      <span className="text-sm font-medium">{name}</span>
      <span className="rounded-full border bg-neutral-50 px-2 py-0.5 text-[11px] text-neutral-600">
        {badge}
      </span>
    </div>
  );
}

function ValueCard({ title, desc }: { title: string; desc: string }) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm leading-relaxed text-neutral-600">
        {desc}
      </CardContent>
    </Card>
  );
}
