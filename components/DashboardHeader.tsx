"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";

interface Props {
  email: string;
}

export function DashboardHeader({ email }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-slate-600 sm:inline">{email}</span>
          <Button variant="secondary" size="sm" onClick={handleLogout} loading={loading}>
            <LogOut className="h-4 w-4" aria-hidden />
            <span>Log out</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
