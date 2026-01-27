// components/routepro/RouteProHeader.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

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
        {/* LEFT */}
        <div className="flex items-center gap-3">
          <Image
            src="/ndw-logo.png"
            alt="NDW Logo"
            width={36}
            height={36}
            priority
          />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight text-white">
              {title}
            </span>
            {tier && (
              <span className="text-[11px] text-sky-300">
                Piano {tier}
              </span>
            )}
          </div>
        </div>

        {/* RIGHT */}
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
