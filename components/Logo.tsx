import Image from "next/image";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  size?: "sm" | "md" | "lg";
}

// Logo asset is 200x100 (2:1 landscape). Already contains the brand
// wordmark, so we render the image alone.
const NATURAL_WIDTH = 200;
const NATURAL_HEIGHT = 100;

// Tailwind classes per size. We use responsive classes so the logo scales
// down on phones (a 200x100 logo is too big for narrow viewports).
//
// - sm: compact footer / inline use
// - md: app headers (dashboard, auth, recipient) - fits in an h-16 header
// - lg: marketing-site header - hits the full 200x100 on desktop per spec
const SIZE_CLASSES: Record<NonNullable<Props["size"]>, string> = {
  sm: "h-7 w-[56px]",
  md: "h-10 w-[80px] lg:h-12 lg:w-[96px]",
  lg: "h-14 w-[112px] sm:h-20 sm:w-[160px] lg:h-[100px] lg:w-[200px]",
};

export function Logo({ className, size = "md" }: Props) {
  return (
    <span className={cn("inline-flex items-center", className)}>
      <Image
        src="/logo.png"
        alt="FileRecall"
        width={NATURAL_WIDTH}
        height={NATURAL_HEIGHT}
        className={SIZE_CLASSES[size]}
        priority
      />
    </span>
  );
}
