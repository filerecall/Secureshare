import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/DashboardHeader";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware already gates this route, but we re-check here so we can read
  // the user's email for the header without re-fetching client-side.
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <DashboardHeader email={user.email ?? ""} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">{children}</main>
    </div>
  );
}
