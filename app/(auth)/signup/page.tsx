import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { normalisePlanParam, parsePlanParam } from "@/lib/plan-param";
import { SignupForm } from "./SignupForm";

export const metadata = { title: "Sign up - FileRecall" };

interface PageProps {
  searchParams: { plan?: string };
}

export default function SignupPage({ searchParams }: PageProps) {
  // Marketing site can deep-link in with /signup?plan=free|pro|enterprise.
  // We pass the (validated) value through to the form so the post-signup
  // redirect knows where to land the new user.
  const plan = parsePlanParam(searchParams.plan);
  const label = plan ? normalisePlanParam(plan).label : null;

  return (
    <Card>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          {label ? `Create your account` : "Create your account"}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {label && plan !== "free"
            ? `One step before you start on the ${label} plan.`
            : "Start sharing documents securely."}
        </p>
      </div>
      <SignupForm preselectedPlan={plan ?? undefined} />
      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link
          href={plan ? `/login?plan=${plan}` : "/login"}
          className="font-medium text-slate-900 underline-offset-4 hover:underline"
        >
          Log in
        </Link>
      </p>
    </Card>
  );
}
