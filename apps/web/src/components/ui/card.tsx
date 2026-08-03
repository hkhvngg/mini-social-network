import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-neutral-200 bg-background text-foreground shadow-none dark:border-neutral-800",
        className,
      )}
      {...props}
    />
  );
}
