import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  size?: "sm" | "md";
}

export function Logo({ className, size = "md" }: Props) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold text-slate-900", className)}>
      <ShieldCheck
        className={cn("text-slate-900", size === "sm" ? "h-4 w-4" : "h-5 w-5")}
        aria-hidden
      />
      <span className={size === "sm" ? "text-sm" : "text-base"}>SecureShare</span>
    </span>
  );
}
