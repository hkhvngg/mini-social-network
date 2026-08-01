import Image from "next/image";
import { cn } from "@/lib/utils";

export function MisonetLogo({ className }: { className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt="Logo Misonet"
      width={48}
      height={48}
      priority
      className={cn("rounded-xl object-cover", className)}
    />
  );
}
