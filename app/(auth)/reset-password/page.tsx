import { Card } from "@/components/ui/Card";
import { ResetPasswordForm } from "./ResetPasswordForm";

export const metadata = { title: "Set a new password - SecureShare" };

export default function ResetPasswordPage() {
  return (
    <Card>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Set a new password</h1>
        <p className="mt-1 text-sm text-slate-600">
          Choose a new password to finish resetting your account.
        </p>
      </div>
      <ResetPasswordForm />
    </Card>
  );
}
