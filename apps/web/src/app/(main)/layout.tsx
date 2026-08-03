"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { AppShell } from "@/components/layout/app-shell";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const needsOnboarding = Boolean(
    user && (!user.interests.length || !user.location.trim()),
  );

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (!loading && needsOnboarding && pathname !== "/onboarding") {
      router.replace("/onboarding");
    }
  }, [loading, user, needsOnboarding, pathname, router]);

  if (loading || !user) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="flex items-center gap-3 font-bold text-slate-500">
          <span className="size-5 animate-spin rounded-full border-2 border-black border-t-transparent dark:border-white dark:border-t-transparent" />
          Đang chuẩn bị không gian của bạn...
        </div>
      </div>
    );
  }

  if (needsOnboarding && pathname !== "/onboarding") return null;

  return pathname === "/onboarding" ? children : <AppShell>{children}</AppShell>;
}
