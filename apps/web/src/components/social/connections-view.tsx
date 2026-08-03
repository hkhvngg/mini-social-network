"use client";

import { useQuery } from "@tanstack/react-query";
import { HeartHandshake, UserRoundCheck, UsersRound } from "lucide-react";
import Link from "next/link";
import { FollowButton } from "./follow-button";
import { Avatar } from "../ui/avatar";
import { Card } from "../ui/card";
import { EmptyState, ErrorState, PageLoading } from "../ui/states";
import { api, getApiError } from "@/lib/api";
import type { Connection, Relationship } from "@/lib/types";
import { cn } from "@/lib/utils";

const config = {
  friends: {
    title: "Bạn bè",
    description: "Những người bạn và họ cùng theo dõi nhau.",
    endpoint: "/users/me/friends",
    empty: "Khi bạn và một người cùng theo dõi nhau, họ sẽ xuất hiện ở đây.",
    icon: HeartHandshake,
  },
  followers: {
    title: "Người theo dõi",
    description: "Những người muốn xem thêm các bài viết của bạn.",
    endpoint: "/users/me/followers",
    empty: "Chưa có ai theo dõi bạn.",
    icon: UsersRound,
  },
  following: {
    title: "Đang theo dõi",
    description: "Những người có bài viết bạn muốn theo dõi.",
    endpoint: "/users/me/following",
    empty: "Bạn chưa theo dõi ai.",
    icon: UserRoundCheck,
  },
} as const;

export function ConnectionsView({
  mode,
  username,
}: {
  mode: keyof typeof config;
  username?: string;
}) {
  const page = config[mode];
  const endpoint = username
    ? `/users/${encodeURIComponent(username)}/${mode}`
    : page.endpoint;
  const query = useQuery({
    queryKey: ["connections", username ?? "me", mode],
    queryFn: async () =>
      (await api.get<Connection[]>(`${endpoint}?limit=100`)).data,
  });
  const Icon = page.icon;

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-4">
        <span className="grid size-12 place-items-center rounded-full bg-neutral-100 text-black dark:bg-neutral-900 dark:text-white">
          <Icon className="size-6" />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{page.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{page.description}</p>
        </div>
      </header>
      {!username ? (
        <nav className="grid grid-cols-3 border-b border-neutral-200 dark:border-neutral-800">
          {(Object.keys(config) as Array<keyof typeof config>).map((tab) => (
            <Link
              key={tab}
              href={`/${tab}`}
              className={cn(
                "border-b-2 px-2 py-3 text-center text-sm font-semibold text-neutral-500",
                mode === tab
                  ? "border-black text-black dark:border-white dark:text-white"
                  : "border-transparent",
              )}
            >
              {config[tab].title}
            </Link>
          ))}
        </nav>
      ) : null}
      {query.isLoading ? <PageLoading /> : null}
      {query.isError ? <ErrorState message={getApiError(query.error)} /> : null}
      {!query.isLoading && !query.data?.length ? (
        <EmptyState title={`Chưa có ${page.title.toLowerCase()}`} description={page.empty} />
      ) : null}
      <Card className="divide-y divide-neutral-200 overflow-hidden dark:divide-neutral-800">
        {query.data?.map((person) => (
          <ConnectionRow key={person.personId} person={person} mode={mode} />
        ))}
      </Card>
    </div>
  );
}

function ConnectionRow({
  person,
  mode,
}: {
  person: Connection;
  mode: keyof typeof config;
}) {
  const status = useQuery({
    queryKey: ["relationship", person.personId],
    queryFn: async () =>
      (
        await api.get<Relationship & { targetPersonId: string }>(
          `/users/${person.personId}/relationship-status`,
        )
      ).data,
  });
  const isFollowing = mode === "following" || mode === "friends" || Boolean(status.data?.isFollowing);

  return (
    <div className="flex items-center gap-3 p-4 sm:p-5">
      <Link href={`/profile/${person.username}`}>
        <Avatar name={person.fullName} src={person.avatarUrl} className="size-12" />
      </Link>
      <Link href={`/profile/${person.username}`} className="min-w-0 flex-1">
        <span className="block truncate text-sm font-extrabold">{person.fullName}</span>
        <span className="block truncate text-xs text-slate-500">@{person.username}</span>
        {person.bio ? <span className="mt-1 block truncate text-xs text-slate-400">{person.bio}</span> : null}
      </Link>
      <FollowButton
        personId={person.personId}
        isFollowing={isFollowing}
        relationship={status.data}
        compact
      />
    </div>
  );
}
