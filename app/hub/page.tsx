// app/hub/page.tsx
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function HubPage() {
  return (
    <main className="min-h-dvh bg-white text-neutral-900">
      <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-2xl border bg-neutral-50" />
            <span className="text-sm font-semibold tracking-tight">NDW Hub</span>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost">Home</Button>
            </Link>
            <Button>Upgrade</Button>
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-5xl px-4 py-8">
        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            Dashboard
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Benvenuto in NDW Hub
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-neutral-600">
            Qui vedrai i tuoi prodotti attivi, il piano, i KPI e le azioni rapide.
            (Auth e piani arrivano nella prossima fase.)
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <KpiCard title="Prodotti attivi" value="1" note="RoutePro (MVP)" />
          <KpiCard title="Stato piano" value="Free" note="Upgrade quando vuoi" />
          <KpiCard title="Automazioni" value="0" note="in arrivo" />
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Prodotti</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ProductRow name="RoutePro" badge="MVP" href="/routepro" />
              <ProductRow name="Ristorazione" badge="In arrivo" href="#" disabled />
              <ProductRow name="Beauty" badge="In arrivo" href="#" disabled />
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Azioni rapide</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Link href="/routepro">
                <Button className="w-full justify-start">Apri RoutePro</Button>
              </Link>
              <Button variant="outline" className="w-full justify-start">
                Gestisci profilo (coming soon)
              </Button>
              <Button variant="secondary" className="w-full justify-start">
                Vedi piani (coming soon)
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}

function KpiCard({
  title,
  value,
  note,
}: {
  title: string;
  value: string;
  note: string;
}) {
  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-neutral-600">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tracking-tight">{value}</div>
        <div className="mt-1 text-xs text-neutral-500">{note}</div>
      </CardContent>
    </Card>
  );
}

function ProductRow({
  name,
  badge,
  href,
  disabled,
}: {
  name: string;
  badge: string;
  href: string;
  disabled?: boolean;
}) {
  const row = (
    <div
      className={[
        "flex items-center justify-between rounded-xl border bg-white px-3 py-2",
        disabled ? "opacity-60" : "hover:bg-neutral-50",
      ].join(" ")}
    >
      <span className="text-sm font-medium">{name}</span>
      <span className="rounded-full border bg-neutral-50 px-2 py-0.5 text-[11px] text-neutral-600">
        {badge}
      </span>
    </div>
  );

  if (disabled) return row;

  return <Link href={href}>{row}</Link>;
}
