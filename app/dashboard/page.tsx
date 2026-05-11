import { FileText, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export const metadata = { title: "Dashboard - SecureShare" };

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-slate-900">Your documents</h1>
        <p className="text-sm text-slate-600">
          Upload a document to start sharing it through a secure, revocable link.
        </p>
      </div>

      <Card className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <FileText className="h-6 w-6 text-slate-500" aria-hidden />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-base font-medium text-slate-900">No documents yet</p>
          <p className="max-w-sm text-sm text-slate-600">
            Upload feature coming in Milestone 2.
          </p>
        </div>
        <Button disabled>
          <Upload className="h-4 w-4" aria-hidden />
          Upload document
        </Button>
      </Card>
    </div>
  );
}
