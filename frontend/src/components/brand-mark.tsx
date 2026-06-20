import Image from "next/image";
import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
  priority?: boolean;
};

export function BrandMark({ className, priority = false }: BrandMarkProps) {
  return (
    <Image
      src="/icon-192.png"
      alt=""
      aria-hidden="true"
      width={192}
      height={192}
      priority={priority}
      className={cn("shrink-0 rounded-lg object-cover", className)}
    />
  );
}
