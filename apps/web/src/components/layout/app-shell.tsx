"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  Ellipsis,
  Home,
  LogOut,
  PenSquare,
  Search,
  Sparkles,
  UserRound,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../auth/auth-provider";
import { Avatar } from "../ui/avatar";
import { Button } from "../ui/button";
import { ThemeToggle } from "./theme-toggle";
import { api } from "@/lib/api";
import type { Recommendation } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MisonetLogo } from "../brand/misonet-logo";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const recommendations = useQuery({
    queryKey: ["recommendations", "sidebar"],
    queryFn: async () =>
      (
        await api.get<{ items: Recommendation[] }>(
          "/recommendations/friends?limit=3",
        )
      ).data.items,
  });

  if (!user) return null;

  const navigation = [
    { href: "/feed", label: "Trang chủ", icon: Home },
    { href: "/search", label: "Tìm kiếm", icon: Search },
    { href: "/feed#composer", label: "Tạo bài", icon: PenSquare },
    { href: "/activity", label: "Hoạt động", icon: Bell },
    { href: `/profile/${user.username}`, label: "Trang cá nhân", icon: UserRound },
    { href: "/friends", label: "Bạn bè", icon: UsersRound },
    { href: "/suggestions", label: "Gợi ý", icon: Sparkles },
  ];
  const mobileNavigation = navigation.slice(0, 5);

  return (
    <div className="min-h-screen bg-white pb-20 text-black dark:bg-black dark:text-white lg:pb-0">
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-neutral-200 bg-white/90 px-4 backdrop-blur dark:border-neutral-800 dark:bg-black/90 lg:hidden">
        <Link href="/feed" aria-label="Misonet — Trang chủ">
          <MisonetLogo className="size-9" />
        </Link>
        <ThemeToggle />
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
                  <Icon className="size-6 shrink-0" strokeWidth={active ? 2.5 : 2} />
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
            <Button
              variant="ghost"
              className="w-full justify-start px-3 xl:px-4"
              onClick={logout}
            >
              <LogOut className="size-5" />
              <span className="hidden xl:inline">Đăng xuất</span>
            </Button>
            <div className="hidden items-center gap-3 rounded-2xl border border-neutral-200 p-3 dark:border-neutral-800 xl:flex">
              <Avatar name={user.fullName} src={user.avatarUrl} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{user.fullName}</span>
                <span className="block truncate text-xs text-neutral-500">@{user.username}</span>
              </span>
              <Ellipsis className="size-4" />
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
                      {person.mutualFriendCount} bạn chung
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
            Misonet gợi ý kết nối dựa trên mạng lưới bạn chung trong Neo4j.
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
                <Icon className="size-6" strokeWidth={active ? 2.6 : 2} />
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
