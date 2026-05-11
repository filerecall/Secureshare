import { cn } from "@/lib/utils";

interface Props {
  tone?: "error" | "success";
  children: React.ReactNode;
}

export function FormMessage({ tone = "error", children }: Props) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-lg border px-3 py-2 text-sm",
        tone === "error"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700",
      )}
    >
      {children}
    </div>
  );
}
