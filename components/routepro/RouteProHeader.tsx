// components/routepro/RouteProHeader.tsx
"use client";

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
    <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-2xl border bg-neutral-50" />
          <span className="text-sm font-semibold tracking-tight">{title}</span>
          {tier && (
            <span className="ml-2 rounded-full border bg-neutral-50 px-2 py-0.5 text-[11px] text-neutral-600">
              {tier}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Link href="/routepro">
            <Button variant="ghost">Rotte</Button>
          </Link>
          <Link href="/routepro/import">
            <Button variant="ghost">Import</Button>
          </Link>
          <Link href="/routepro/start">
            <Button variant="ghost">Guida</Button>
          </Link>
          <Link href="/routepro/settings">
            <Button variant="outline">Settings</Button>
          </Link>
          <Link href="/hub">
            <Button variant="ghost">NDW Hub</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
