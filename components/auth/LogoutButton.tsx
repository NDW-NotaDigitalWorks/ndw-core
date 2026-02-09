// components/auth/LogoutButton.tsx
"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";

export function LogoutButton({ variant = "outline" }: { variant?: "default" | "secondary" | "outline" | "ghost" }) {
  const router = useRouter();

  async function onLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Button type="button" variant={variant} onClick={onLogout}>
      Logout
    </Button>
  );
}
