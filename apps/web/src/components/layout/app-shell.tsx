"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  Home,
  PenSquare,
  Search,
  Sparkles,
  UserRound,
  UsersRound,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../auth/auth-provider";
import { Avatar } from "../ui/avatar";
import { ThemeToggle } from "./theme-toggle";
import { AccountMenu } from "./account-menu";
import { api } from "@/lib/api";
import type { Recommendation } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MisonetLogo } from "../brand/misonet-logo";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const recommendations = useQuery({
    queryKey: ["recommendations", "sidebar"],
    queryFn: async () =>
      (
        await api.get<{ items: Recommendation[] }>(
          "/recommendations/friends?limit=3",
        )
      ).data.items,
  });
  const unreadNotifications = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () =>
      (await api.get<{ unreadCount: number }>("/notifications/unread-count"))
        .data.unreadCount,
    refetchInterval: 30_000,
  });

  if (!user) return null;

  const navigation = [
    { href: "/feed", label: "Trang chủ", icon: Home },
    { href: "/search", label: "Tìm kiếm", icon: Search },
    { href: "/feed#composer", label: "Tạo bài", icon: PenSquare },
    { href: "/activity", label: "Thông báo", icon: Bell },
    { href: `/profile/${user.username}`, label: "Trang cá nhân", icon: UserRound },
    { href: "/friends", label: "Bạn bè", icon: UsersRound },
    { href: "/suggestions", label: "Gợi ý", icon: Sparkles },
    ...(user.role === "ADMIN"
      ? [{ href: "/admin", label: "Quản trị", icon: ShieldCheck }]
      : []),
  ];
  const mobileNavigation = navigation.slice(0, 5);

  return (
    <div className="min-h-screen bg-background pb-20 text-foreground lg:pb-0">
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-neutral-200 bg-white/90 px-4 backdrop-blur dark:border-neutral-800 dark:bg-black/90 lg:hidden">
        <Link href="/feed" aria-label="Misonet — Trang chủ">
          <MisonetLogo className="size-9" />
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <AccountMenu mobile />
        </div>
      </header>

      <div className="mx-auto grid max-w-[1280px] lg:grid-cols-[80px_minmax(0,640px)] lg:gap-6 lg:px-4 xl:grid-cols-[240px_minmax(0,640px)_300px]">
        <aside className="sticky top-0 hidden h-screen flex-col py-5 lg:flex">
          <Link
            href="/feed"
            aria-label="Misonet — Trang chủ"
            className="mb-6 grid size-12 place-items-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900 xl:ml-2"
          >
            <MisonetLogo className="size-10" />
          </Link>

          <nav className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active =
                item.href === "/feed#composer"
                  ? false
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={item.label}
                  className={cn(
                    "flex h-12 items-center gap-4 rounded-full px-3 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-black dark:hover:bg-neutral-900 dark:hover:text-white xl:px-4",
                    active && "font-semibold text-black dark:text-white",
                  )}
                >
                  <span className="relative shrink-0">
                    <Icon className="size-6" strokeWidth={active ? 2.5 : 2} />
                    {item.href === "/activity" && unreadNotifications.data ? (
                      <span className="absolute -right-2 -top-2 grid min-w-4 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-bold leading-4 text-white">
                        {unreadNotifications.data > 99 ? "99+" : unreadNotifications.data}
                      </span>
                    ) : null}
                  </span>
                  <span className="hidden text-[15px] xl:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto space-y-2">
            <div className="flex items-center xl:px-2">
              <ThemeToggle />
              <span className="ml-3 hidden text-sm text-neutral-500 xl:inline">Giao diện</span>
            </div>
            <div className="xl:hidden">
              <AccountMenu mobile />
            </div>
            <div className="hidden xl:block">
              <AccountMenu />
            </div>
          </div>
        </aside>

        <main className="min-w-0">{children}</main>

        <aside className="sticky top-0 hidden h-fit py-6 xl:block">
          <div className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Gợi ý cho bạn</h2>
              <Link href="/suggestions" className="text-xs font-semibold text-neutral-500 hover:text-black dark:hover:text-white">
                Xem tất cả
              </Link>
            </div>
            <div className="mt-5 space-y-5">
              {recommendations.data?.map((person) => (
                <Link
                  key={person.personId}
                  href={`/profile/${person.username}`}
                  className="flex items-center gap-3"
                >
                  <Avatar name={person.fullName} src={person.avatarUrl} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{person.fullName}</span>
                    <span className="block truncate text-xs text-neutral-500">
                      {person.sharedInterests.length
                        ? `${person.sharedInterests.length} sở thích chung`
                        : person.sameLocation
                          ? `Cùng ở ${person.location}`
                          : `${person.mutualFriendCount} bạn chung`}
                    </span>
                  </span>
                </Link>
              ))}
              {!recommendations.isLoading && !recommendations.data?.length ? (
                <p className="text-sm text-neutral-500">Chưa có gợi ý mới.</p>
              ) : null}
            </div>
          </div>
          <p className="mt-4 px-2 text-xs leading-5 text-neutral-500">
            Có thể bạn từng gặp nhau đâu đó — qua bạn chung, sở thích hoặc cùng một thành phố.
          </p>
        </aside>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-neutral-800 dark:bg-black/95 lg:hidden">
        <div className="mx-auto flex h-16 max-w-lg items-center justify-around">
          {mobileNavigation.map((item) => {
            const Icon = item.icon;
            const active =
              item.href !== "/feed#composer" && pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                className="grid size-11 place-items-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900"
              >
                <span className="relative">
                  <Icon className="size-6" strokeWidth={active ? 2.6 : 2} />
                  {item.href === "/activity" && unreadNotifications.data ? (
                    <span className="absolute -right-2 -top-2 size-2.5 rounded-full border-2 border-white bg-rose-600 dark:border-black" />
                  ) : null}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
