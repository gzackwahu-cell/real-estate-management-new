import Image from "next/image";
import { AGENCY } from "@/lib/constants/agency";
import { cn } from "cn";

type DanwellLogoProps = {
  width?: number;
  height?: number;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  showWordmark?: boolean;
  wordmarkClassName?: string;
};

/**
 * The champagne-gold Danwell House emblem is the canonical brand mark used by
 * the public site, admin console and sign-in screen.
 */
export function DanwellLogo({
  width = 48,
  height = 32,
  className,
  imageClassName,
  priority = false,
  showWordmark = true,
  wordmarkClassName,
}: DanwellLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Image
        src="/danwell-emblem.png"
        alt={`${AGENCY.name} emblem`}
        width={width}
        height={height}
        priority={priority}
        className={cn("object-contain", imageClassName)}
      />
      {showWordmark ? (
        <span className={cn("min-w-0", wordmarkClassName)}>
          <span className="block truncate text-sm leading-4 font-semibold tracking-tight">
            {AGENCY.shortName}
          </span>
          <span className="block text-[10px] tracking-[0.14em] text-current opacity-60 uppercase">
            Property Management
          </span>
        </span>
      ) : null}
    </span>
  );
}
