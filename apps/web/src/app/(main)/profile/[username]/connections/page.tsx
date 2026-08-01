"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ConnectionsView } from "@/components/social/connections-view";
import { cn } from "@/lib/utils";

const tabs = [
  { value: "friends", label: "Bạn bè" },
  { value: "followers", label: "Follower" },
  { value: "following", label: "Following" },
] as const;

export default function ProfileConnectionsPage() {
  const params = useParams<{ username: string }>();
  const searchParams = useSearchParams();
  const username = decodeURIComponent(params.username);
  const requestedTab = searchParams.get("tab");
  const mode = tabs.some((tab) => tab.value === requestedTab)
    ? (requestedTab as (typeof tabs)[number]["value"])
    : "friends";

  return (
    <section className="min-h-[70vh] border-x border-neutral-200 dark:border-neutral-800">
      <header className="border-b border-neutral-200 px-4 pt-4 dark:border-neutral-800 sm:px-6">
        <div className="flex items-center gap-3 pb-4">
          <Link
            href={`/profile/${username}`}
            className="grid size-10 place-items-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900"
            aria-label="Quay lại profile"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div>
            <h1 className="font-bold">Kết nối</h1>
            <p className="text-sm text-neutral-500">@{username}</p>
          </div>
        </div>
        <nav className="grid grid-cols-3" aria-label="Danh sách kết nối">
          {tabs.map((tab) => (
            <Link
              key={tab.value}
              href={`/profile/${username}/connections?tab=${tab.value}`}
              className={cn(
                "border-b-2 px-2 py-3 text-center text-sm font-semibold text-neutral-500",
                mode === tab.value
                  ? "border-black text-black dark:border-white dark:text-white"
                  : "border-transparent",
              )}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </header>
      <div className="p-4 sm:p-6">
        <ConnectionsView mode={mode} username={username} />
      </div>
    </section>
  );
}
