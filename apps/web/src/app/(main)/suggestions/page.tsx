"use client";

import { useQuery } from "@tanstack/react-query";
import { Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { FollowButton } from "@/components/social/follow-button";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, PageLoading } from "@/components/ui/states";
import { api } from "@/lib/api";
import type { Recommendation } from "@/lib/types";

export default function SuggestionsPage() {
  const query = useQuery({
    queryKey: ["recommendations", "all"],
    queryFn: async () =>
      (await api.get<{ items: Recommendation[] }>("/recommendations/friends?limit=50"))
        .data.items,
  });

  return (
    <section className="min-h-[70vh] border-x border-neutral-200 dark:border-neutral-800">
      <header className="flex items-center gap-4 border-b border-neutral-200 px-4 py-5 dark:border-neutral-800 sm:px-6">
        <span className="grid size-12 place-items-center rounded-full bg-neutral-100 dark:bg-neutral-900">
          <Sparkles className="size-6" />
        </span>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Gợi ý kết nối</h1>
          <p className="mt-1 text-sm text-neutral-500">Khám phá bạn của bạn, xếp hạng theo số kết nối chung.</p>
        </div>
      </header>
      {query.isLoading ? <div className="p-4"><PageLoading /></div> : null}
      {query.isError ? <div className="p-4"><ErrorState /></div> : null}
      {!query.isLoading && !query.data?.length ? (
        <EmptyState title="Chưa có gợi ý" description="Hãy kết nối thêm bạn bè để mở rộng mạng lưới." />
      ) : null}
      <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
        {query.data?.map((person) => (
          <Card key={person.personId} className="rounded-none border-0 p-5">
            <div className="flex items-start gap-3">
              <Link href={`/profile/${person.username}`}>
                <Avatar name={person.fullName} src={person.avatarUrl} className="size-14" />
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/profile/${person.username}`} className="block truncate font-bold hover:underline">
                  {person.fullName}
                </Link>
                <p className="truncate text-xs text-slate-500">@{person.username}</p>
                <p className="mt-2 flex items-center gap-1 text-xs font-semibold">
                  <Users className="size-3.5" /> {person.mutualFriendCount} bạn chung
                </p>
              </div>
            </div>
            <p className="mt-4 line-clamp-2 min-h-10 text-xs leading-5 text-slate-500">
              Qua {person.mutualFriends.map((friend) => friend.fullName).join(", ")}
            </p>
            <FollowButton
              personId={person.personId}
              isFollowing={person.relationship.isFollowing}
              relationship={person.relationship}
              compact
            />
          </Card>
        ))}
      </div>
    </section>
  );
}
