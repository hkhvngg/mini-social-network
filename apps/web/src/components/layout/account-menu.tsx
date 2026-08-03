"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Ellipsis,
  LogOut,
  ShieldCheck,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useAuth } from "../auth/auth-provider";
import { Avatar } from "../ui/avatar";
import { cn } from "@/lib/utils";

export function AccountMenu({ mobile = false }: { mobile?: boolean }) {
  const { user, logout } = useAuth();
  if (!user) return null;

  if (mobile) {
    return (
      <Dialog.Root>
        <Dialog.Trigger asChild>
          <button
            type="button"
            aria-label="Mở menu tài khoản"
            className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
          >
            <Avatar name={user.fullName} src={user.avatarUrl} className="size-9" />
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[1px]" />
          <Dialog.Content className="fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[60] max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-3xl border border-neutral-200 bg-white p-2 shadow-2xl outline-none dark:border-neutral-700 dark:bg-neutral-950 lg:bottom-4 lg:left-24 lg:right-auto lg:w-72">
            <Dialog.Title className="sr-only">Menu tài khoản</Dialog.Title>
            <Dialog.Description className="sr-only">
              Truy cập trang cá nhân, bạn bè, quản trị hoặc đăng xuất.
            </Dialog.Description>
            <div className="flex items-center gap-3 px-3 py-2">
              <Avatar name={user.fullName} src={user.avatarUrl} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {user.fullName}
                </span>
                <span className="block truncate text-xs text-neutral-500">
                  @{user.username}
                </span>
              </span>
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label="Đóng menu tài khoản"
                  className="grid size-9 place-items-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-black dark:hover:bg-neutral-900 dark:hover:text-white"
                >
                  <X className="size-4" />
                </button>
              </Dialog.Close>
            </div>
            <div className="my-1 h-px bg-neutral-200 dark:bg-neutral-800" />
            <MobileMenuLink href={`/profile/${user.username}`}>
              <UserRound className="size-4" /> Trang cá nhân
            </MobileMenuLink>
            <MobileMenuLink href="/friends">
              <UsersRound className="size-4" /> Bạn bè
            </MobileMenuLink>
            {user.role === "ADMIN" ? (
              <MobileMenuLink href="/admin">
                <ShieldCheck className="size-4" /> Quản trị
              </MobileMenuLink>
            ) : null}
            <div className="my-1 h-px bg-neutral-200 dark:bg-neutral-800" />
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-rose-600 outline-none hover:bg-rose-50 focus:bg-rose-50 dark:hover:bg-rose-950/40 dark:focus:bg-rose-950/40"
              onClick={logout}
            >
              <LogOut className="size-4" /> Đăng xuất
            </button>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="Mở menu tài khoản"
          className={cn(
            "flex w-full items-center gap-3 rounded-2xl border border-neutral-200 p-3 text-left outline-none transition hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-neutral-400 dark:border-neutral-800 dark:hover:bg-neutral-900",
          )}
        >
          <Avatar name={user.fullName} src={user.avatarUrl} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">
              {user.fullName}
            </span>
            <span className="block truncate text-xs text-neutral-500">
              @{user.username}
            </span>
          </span>
          <Ellipsis className="size-4 shrink-0" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-56 overflow-hidden rounded-2xl border border-neutral-200 bg-white p-1.5 shadow-xl dark:border-neutral-700 dark:bg-neutral-950"
        >
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold">{user.fullName}</p>
            <p className="truncate text-xs text-neutral-500">@{user.username}</p>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-neutral-200 dark:bg-neutral-800" />
          <MenuLink href={`/profile/${user.username}`}>
            <UserRound className="size-4" /> Trang cá nhân
          </MenuLink>
          <MenuLink href="/friends">
            <UsersRound className="size-4" /> Bạn bè
          </MenuLink>
          {user.role === "ADMIN" ? (
            <MenuLink href="/admin">
              <ShieldCheck className="size-4" /> Quản trị
            </MenuLink>
          ) : null}
          <DropdownMenu.Separator className="my-1 h-px bg-neutral-200 dark:bg-neutral-800" />
          <DropdownMenu.Item
            className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-600 outline-none hover:bg-rose-50 focus:bg-rose-50 dark:hover:bg-rose-950/40 dark:focus:bg-rose-950/40"
            onSelect={logout}
          >
            <LogOut className="size-4" /> Đăng xuất
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function MobileMenuLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Close asChild>
      <Link
        href={href}
        className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium outline-none hover:bg-neutral-100 focus:bg-neutral-100 dark:hover:bg-neutral-900 dark:focus:bg-neutral-900"
      >
        {children}
      </Link>
    </Dialog.Close>
  );
}

function MenuLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <DropdownMenu.Item asChild>
      <Link
        href={href}
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium outline-none hover:bg-neutral-100 focus:bg-neutral-100 dark:hover:bg-neutral-900 dark:focus:bg-neutral-900"
      >
        {children}
      </Link>
    </DropdownMenu.Item>
  );
}
