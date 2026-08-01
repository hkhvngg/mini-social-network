import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xl border border-neutral-300 bg-white px-3.5 text-sm outline-none transition placeholder:text-neutral-500 focus:border-black focus:ring-2 focus:ring-neutral-300 dark:border-neutral-700 dark:bg-black dark:focus:border-white dark:focus:ring-neutral-700",
        className,
      )}
      {...props}
    />
  );
}
