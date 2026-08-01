"use client";

import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn, initials } from "@/lib/utils";

export function Avatar({
  name,
  src,
  className,
}: {
  name: string;
  src?: string | null;
  className?: string;
}) {
  return (
    <AvatarPrimitive.Root
      className={cn(
        "relative inline-flex size-10 shrink-0 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800",
        className,
      )}
    >
      {src ? (
        <AvatarPrimitive.Image
          className="size-full object-cover"
          src={src}
          alt={name}
        />
      ) : null}
      <AvatarPrimitive.Fallback className="flex size-full items-center justify-center text-xs font-bold text-neutral-700 dark:text-neutral-200">
        {initials(name)}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}
