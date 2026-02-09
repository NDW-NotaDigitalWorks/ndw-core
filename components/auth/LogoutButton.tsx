"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();

  async function onLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <Button
      variant="outline"
      onClick={onLogout}
      type="button"
    >
      Logout
    </Button>
  );
}
