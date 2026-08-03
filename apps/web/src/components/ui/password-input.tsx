"use client";

import { Eye, EyeOff } from "lucide-react";
import * as React from "react";
import { Input } from "./input";
import { cn } from "@/lib/utils";

export const PasswordInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, onChange, ...props }, ref) => {
  const [visible, setVisible] = React.useState(false);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const asciiValue = event.currentTarget.value.replace(/[^\x21-\x7E]/g, "");
    if (asciiValue !== event.currentTarget.value) {
      event.currentTarget.value = asciiValue;
    }
    onChange?.(event);
  }

  return (
    <span className="relative block">
      <Input
        {...props}
        ref={ref}
        type={visible ? "text" : "password"}
        inputMode="text"
        lang="en"
        autoCapitalize="none"
        spellCheck={false}
        pattern="[!-~]+"
        className={cn("pr-12", className)}
        onChange={handleChange}
      />
      <button
        type="button"
        aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        aria-pressed={visible}
        title={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        className="absolute right-1 top-1 grid size-9 place-items-center rounded-lg text-neutral-500 transition hover:bg-neutral-100 hover:text-black focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white dark:focus:ring-neutral-700"
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
      </button>
    </span>
  );
});

PasswordInput.displayName = "PasswordInput";
