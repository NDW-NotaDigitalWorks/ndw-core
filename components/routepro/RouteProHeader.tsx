// components/routepro/RouteProHeader.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

function TierBadge({ tier }: { tier?: string }) {
  const t = (tier || "").toUpperCase();

  if (t === "ELITE") {
    return (
      <span className="ml-2 rounded-full border border-amber-300/50 bg-amber-400/10 px-2 py-0.5 text-[11px] text-amber-200">
        ELITE • Power User
      </span>
    );
  }

  if (t === "PRO") {
    return (
      <span className="ml-2 rounded-full border border-sky-400/50 bg-sky-400/10 px-2 py-0.5 text-[11px] text-sky-200">
        PRO
      </span>
    );
  }

  if (t) {
    return (
      <span className="ml-2 rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[11px] text-white">
        STARTER
      </span>
    );
  }

  return null;
}

export function RouteProHeader({
  title = "RoutePro",
  tier,
}: {
  title?: string;
  tier?: string; // STARTER / PRO / ELITE
}) {
  return (
    <header className="sticky top-0 z-10 border-b bg-[#050B1E]/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3 text-white">
        <div className="flex items-center gap-3">
          <Image src="/ndw-logo.png" alt="NDW" width={36} height={36} priority />
          <div className="flex items-center">
            <span className="text-sm font-semibold tracking-tight text-white">
              {title}
            </span>
            <TierBadge tier={tier} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/routepro">
            <Button variant="ghost" className="text-white hover:bg-white/10">
              Rotte
            </Button>
          </Link>
          <Link href="/routepro/import">
            <Button variant="ghost" className="text-white hover:bg-white/10">
              Import
            </Button>
          </Link>
          <Link href="/routepro/start">
            <Button variant="ghost" className="text-white hover:bg-white/10">
              Guida
            </Button>
          </Link>
          <Link href="/routepro/settings">
            <Button
              variant="outline"
              className="border-sky-400 text-sky-300 hover:bg-sky-400/10"
            >
              Settings
            </Button>
          </Link>
          <Link href="/hub">
            <Button variant="ghost" className="text-white hover:bg-white/10">
              NDW Hub
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
