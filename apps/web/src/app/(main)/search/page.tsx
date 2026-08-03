"use client";

import { useQuery } from "@tanstack/react-query";
import { LockKeyhole, Search, UsersRound } from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { FollowButton } from "@/components/social/follow-button";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState, ErrorState, PageLoading } from "@/components/ui/states";
import { api } from "@/lib/api";
import type { UserSearchResult } from "@/lib/types";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());
  const results = useQuery({
    queryKey: ["search", deferredQuery],
    queryFn: async () =>
      (
        await api.get<UserSearchResult[]>(
          `/users/search?q=${encodeURIComponent(deferredQuery)}&limit=30`,
        )
      ).data,
    enabled: deferredQuery.length > 0,
  });

  return (
    <section className="min-h-[70vh] border-x border-neutral-200 dark:border-neutral-800">
      <header className="sticky top-14 z-20 border-b border-neutral-200 bg-white/90 px-4 py-4 backdrop-blur dark:border-neutral-800 dark:bg-black/90 sm:px-6 lg:top-0">
        <h1 className="text-xl font-bold">Tìm kiếm</h1>
        <div className="mt-4 flex items-center gap-3 rounded-full bg-neutral-100 px-4 dark:bg-neutral-900">
          <Search className="size-5 text-neutral-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoFocus
            placeholder="Nhập tên hoặc @tên_người_dùng"
            className="h-12 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-neutral-500"
            aria-label="Tìm kiếm người dùng"
          />
        </div>
      </header>

      {!deferredQuery ? (
        <div className="px-4 py-12 sm:px-6">
          <EmptyState
            title="Bạn muốn tìm ai?"
            description="Nhập tên hoặc tên người dùng để tìm bạn bè trên Misonet."
          />
        </div>
      ) : null}
      {results.isLoading ? <div className="p-4"><PageLoading /></div> : null}
      {results.isError ? (
        <div className="p-4"><ErrorState message="Tìm kiếm đang gặp chút trục trặc. Bạn thử lại nhé." /></div>
      ) : null}
      {!results.isLoading && deferredQuery && !results.data?.length ? (
        <div className="px-4 py-12 sm:px-6">
          <EmptyState
            title="Không tìm thấy ai phù hợp"
            description={`Không có kết quả phù hợp với “${deferredQuery}”.`}
          />
        </div>
      ) : null}

      <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
        {results.data?.map((person) => (
          <div key={person.personId} className="flex items-center gap-3 px-4 py-4 sm:px-6">
            <Link href={`/profile/${person.username}`}>
              <Avatar name={person.fullName} src={person.avatarUrl} className="size-12" />
            </Link>
            <Link href={`/profile/${person.username}`} className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 truncate text-sm font-semibold">
                {person.fullName}
                {person.isPrivate ? <LockKeyhole className="size-3.5 text-neutral-500" /> : null}
              </span>
              <span className="block truncate text-sm text-neutral-500">@{person.username}</span>
              {person.bio ? <span className="mt-1 block truncate text-sm">{person.bio}</span> : null}
            </Link>
            {!person.relationship.isSelf ? (
              <FollowButton
                personId={person.personId}
                isFollowing={person.relationship.isFollowing}
                relationship={person.relationship}
                compact
              />
            ) : (
              <UsersRound className="size-5 text-neutral-400" aria-label="Tài khoản của bạn" />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
