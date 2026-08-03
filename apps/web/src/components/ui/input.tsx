import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-11 w-full rounded-xl border border-neutral-300 bg-background px-3.5 text-sm text-foreground outline-none transition placeholder:text-neutral-500 focus:border-black focus:ring-2 focus:ring-neutral-300 dark:border-neutral-700 dark:focus:border-white dark:focus:ring-neutral-700",
      className,
    )}
    {...props}
  />
));

Input.displayName = "Input";
