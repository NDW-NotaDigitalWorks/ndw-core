"use client";

import { useRouter } from "next/navigation";
import { LogoutButton } from "@/components/auth/LogoutButton";
import ImportVoiceContent from "@/components/routepro/ImportVoiceContent";

export default function ImportVoicePage() {
  const router = useRouter();

  return (
    <main className="min-h-dvh bg-neutral-50 p-3 pb-28">
      <div className="mx-auto max-w-md space-y-3">
        {/* TOP BAR */}
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">RoutePro • Import</div>
          <LogoutButton />
        </div>

        {/* CONTENUTO VOCALE */}
        <ImportVoiceContent onBack={() => router.push("/routepro/import")} />
      </div>
    </main>
  );
}
