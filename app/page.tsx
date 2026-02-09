// app/page.tsx
import Link from "next/link";

const ROUTEPRO_URL = "https://routepro.notadigitalworks.com/routepro";

export default function HomePage() {
  return (
    <main className="min-h-dvh bg-neutral-50">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-neutral-900" />
            <div className="leading-tight">
              <div className="text-sm font-semibold text-neutral-900">NDW</div>
              <div className="text-[11px] text-neutral-500">Nota Digital Works</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={ROUTEPRO_URL}
              className="rounded-xl border bg-white px-3 py-2 text-sm text-neutral-900 hover:bg-neutral-50"
            >
              RoutePro
            </a>

            <Link
              href="/login?next=/routepro"
              className="rounded-xl bg-neutral-900 px-3 py-2 text-sm text-white hover:opacity-90"
            >
              Accedi
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-4 py-10">
        <div className="grid gap-6 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs text-neutral-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Ecosistema NDW • Tools per chi lavora sul campo
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-neutral-900 md:text-4xl">
              Software intelligenti per chi lavora davvero.
            </h1>

            <p className="mt-3 text-base text-neutral-600">
              NDW crea strumenti pratici per driver, broker e operatori digitali:
              meno caos, più controllo, più tempo.
            </p>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Link
                href="/login?next=/routepro"
                className="inline-flex items-center justify-center rounded-2xl bg-neutral-900 px-4 py-3 text-sm font-medium text-white hover:opacity-90"
              >
                Accedi a NDW CORE
              </Link>

              <a
                href={ROUTEPRO_URL}
                className="inline-flex items-center justify-center rounded-2xl border bg-white px-4 py-3 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
              >
                Scopri RoutePro
              </a>
            </div>

            <div className="mt-4 text-xs text-neutral-500">
              Roadmap: RoutePro • NDW CORE • TIXION3 (coming soon)
            </div>
          </div>

          {/* Visual card */}
          <div className="rounded-3xl border bg-white p-4 shadow-sm">
            <div className="rounded-2xl bg-neutral-900 p-4 text-white">
              <div className="text-xs text-white/70">Esempio valore NDW</div>
              <div className="mt-2 text-lg font-semibold">Importa → verifica → crea → guida</div>
              <div className="mt-2 text-sm text-white/80">
                Screenshot Flex → parsing → revisione stop → Driver Mode con pacchi e stato consegna.
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border bg-neutral-50 p-3">
                <div className="text-sm font-semibold text-neutral-900">Velocità</div>
                <div className="mt-1 text-sm text-neutral-600">
                  Riduci minuti persi in import e gestione rotta.
                </div>
              </div>
              <div className="rounded-2xl border bg-neutral-50 p-3">
                <div className="text-sm font-semibold text-neutral-900">Precisione</div>
                <div className="mt-1 text-sm text-neutral-600">
                  Revisione stop editabile prima di creare la rotta.
                </div>
              </div>
              <div className="rounded-2xl border bg-neutral-50 p-3">
                <div className="text-sm font-semibold text-neutral-900">Controllo</div>
                <div className="mt-1 text-sm text-neutral-600">
                  Driver Mode: avanzamento, pacchi, warning rientro.
                </div>
              </div>
              <div className="rounded-2xl border bg-neutral-50 p-3">
                <div className="text-sm font-semibold text-neutral-900">Scalabilità</div>
                <div className="mt-1 text-sm text-neutral-600">
                  Una base unica NDW per più prodotti e utenti.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Products */}
      <section className="mx-auto max-w-5xl px-4 pb-12">
        <h2 className="text-xl font-semibold text-neutral-900">Prodotti NDW</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Strumenti separati, esperienza coerente.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {/* RoutePro */}
          <div className="rounded-3xl border bg-white p-4 shadow-sm">
            <div className="text-xs text-neutral-500">Driver / Logistica</div>
            <div className="mt-1 text-lg font-semibold text-neutral-900">RoutePro</div>
            <ul className="mt-3 space-y-2 text-sm text-neutral-600">
              <li>• Import da screenshot/testo</li>
              <li>• Revisione stop editabile</li>
              <li>• Driver Mode con pacchi</li>
            </ul>
            <a
              href={ROUTEPRO_URL}
              className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Apri RoutePro
            </a>
          </div>

          {/* NDW Core */}
          <div className="rounded-3xl border bg-white p-4 shadow-sm">
            <div className="text-xs text-neutral-500">Piattaforma</div>
            <div className="mt-1 text-lg font-semibold text-neutral-900">NDW CORE</div>
            <ul className="mt-3 space-y-2 text-sm text-neutral-600">
              <li>• Hub accesso e gestione</li>
              <li>• Struttura multi-tool</li>
              <li>• Base per licensing & piani</li>
            </ul>
            <Link
              href="/login?next=/routepro"
              className="mt-4 inline-flex w-full items-center justify-center rounded-2xl border bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
            >
              Accedi a NDW CORE
            </Link>
          </div>

          {/* Tixion */}
          <div className="rounded-3xl border bg-white p-4 shadow-sm">
            <div className="text-xs text-neutral-500">Ticketing</div>
            <div className="mt-1 text-lg font-semibold text-neutral-900">TIXION3</div>
            <ul className="mt-3 space-y-2 text-sm text-neutral-600">
              <li>• Stock intelligente</li>
              <li>• Automazioni & ROI</li>
              <li>• Workflow pro broker</li>
            </ul>
            <div className="mt-4 inline-flex w-full items-center justify-center rounded-2xl border bg-neutral-50 px-4 py-2 text-sm font-medium text-neutral-700">
              Coming soon
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-6 text-sm text-neutral-600 md:flex-row md:items-center md:justify-between">
          <div>© {new Date().getFullYear()} Nota Digital Works</div>
          <div className="flex gap-4">
            <a className="hover:text-neutral-900" href={ROUTEPRO_URL}>
              RoutePro
            </a>
            <Link className="hover:text-neutral-900" href="/login?next=/routepro">
              NDW CORE
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
