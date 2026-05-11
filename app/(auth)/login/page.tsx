import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Log in - SecureShare" };

export default function LoginPage({
  searchParams,
}: {
  searchParams: { redirectTo?: string };
}) {
  return (
    <Card>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-600">Log in to your SecureShare account.</p>
      </div>
      <LoginForm redirectTo={searchParams.redirectTo} />
      <p className="mt-6 text-center text-sm text-slate-600">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-slate-900 underline-offset-4 hover:underline">
          Sign up
        </Link>
      </p>
    </Card>
  );
}
