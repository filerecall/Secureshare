import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { SignupForm } from "./SignupForm";

export const metadata = { title: "Sign up - SecureShare" };

export default function SignupPage() {
  return (
    <Card>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Create your account</h1>
        <p className="mt-1 text-sm text-slate-600">Start sharing documents securely.</p>
      </div>
      <SignupForm />
      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-slate-900 underline-offset-4 hover:underline">
          Log in
        </Link>
      </p>
    </Card>
  );
}
