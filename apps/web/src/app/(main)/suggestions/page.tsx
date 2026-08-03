"use client";

import { useQuery } from "@tanstack/react-query";
import { MapPin, Sparkles, UserRoundSearch, Users } from "lucide-react";
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
  const peopleYouMayKnow = query.data?.filter(
    (person) =>
      person.category === "PEOPLE_YOU_MAY_KNOW" || person.mutualFriendCount > 0,
  );
  const friendSuggestions = query.data?.filter(
    (person) =>
      person.category === "FRIEND_SUGGESTION" && person.mutualFriendCount === 0,
  );

  return (
    <section className="min-h-[70vh] border-x border-neutral-200 dark:border-neutral-800">
      <header className="flex items-center gap-4 border-b border-neutral-200 px-4 py-5 dark:border-neutral-800 sm:px-6">
        <span className="grid size-12 place-items-center rounded-full bg-neutral-100 dark:bg-neutral-900">
          <Sparkles className="size-6" />
        </span>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Tìm thêm bạn mới</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Gặp những người có thể hợp chuyện với bạn qua bạn chung, sở thích hoặc nơi ở.
          </p>
        </div>
      </header>

      {query.isLoading ? <div className="p-5"><PageLoading /></div> : null}
      {query.isError ? <div className="p-5"><ErrorState /></div> : null}
      {!query.isLoading && !query.data?.length ? (
        <div className="p-5">
          <EmptyState title="Chưa tìm thấy gợi ý phù hợp" description="Bạn có thể thêm sở thích và nơi đang sống để Misonet hiểu bạn hơn." />
        </div>
      ) : null}

      {query.data?.length ? (
        <div className="space-y-8 p-4 sm:p-6">
          <SuggestionSection
            title="Những người bạn có thể biết"
            description="Những người có bạn chung với bạn."
            icon={Users}
            people={peopleYouMayKnow ?? []}
            emptyMessage="Chưa tìm thấy người có bạn chung."
          />
          <SuggestionSection
            title="Gợi ý kết bạn"
            description="Những người có cùng sở thích hoặc sống gần bạn."
            icon={UserRoundSearch}
            people={friendSuggestions ?? []}
            emptyMessage="Chưa tìm thấy người có sở thích hoặc nơi ở phù hợp."
          />
        </div>
      ) : null}
    </section>
  );
}

function SuggestionSection({
  title,
  description,
  icon: Icon,
  people,
  emptyMessage,
}: {
  title: string;
  description: string;
  icon: typeof Users;
  people: Recommendation[];
  emptyMessage: string;
}) {
  return (
    <section aria-labelledby={title.replaceAll(" ", "-").toLowerCase()}>
      <div className="mb-4 flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-neutral-100 dark:bg-neutral-900">
          <Icon className="size-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 id={title.replaceAll(" ", "-").toLowerCase()} className="font-bold">{title}</h2>
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-500 dark:bg-neutral-900">{people.length}</span>
          </div>
          <p className="mt-0.5 text-xs leading-5 text-neutral-500">{description}</p>
        </div>
      </div>

      {people.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {people.map((person) => <RecommendationCard key={person.personId} person={person} />)}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-500 dark:border-neutral-700">
          {emptyMessage}
        </div>
      )}
    </section>
  );
}

function RecommendationCard({ person }: { person: Recommendation }) {
  return (
    <Card className="flex min-h-64 flex-col p-4">
      <div className="flex items-start gap-3">
        <Link href={`/profile/${person.username}`}>
          <Avatar name={person.fullName} src={person.avatarUrl} className="size-12" />
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={`/profile/${person.username}`} className="block truncate text-sm font-bold hover:underline">
            {person.fullName}
          </Link>
          <p className="truncate text-xs text-neutral-500">@{person.username}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2 text-xs">
        {person.mutualFriendCount > 0 ? (
          <p className="flex items-center gap-1.5 font-semibold">
            <Users className="size-3.5" /> {person.mutualFriendCount} bạn chung
          </p>
        ) : null}
        {person.sameLocation ? (
          <p className="flex items-start gap-1.5 text-neutral-500">
            <MapPin className="mt-0.5 size-3.5 shrink-0" /> Cùng sống tại {person.location}
          </p>
        ) : null}
        {person.sharedInterests.length ? (
          <p className="line-clamp-2 leading-5 text-neutral-500">
            <strong className="text-neutral-700 dark:text-neutral-300">Sở thích chung:</strong>{" "}
            {person.sharedInterests.join(", ")}
          </p>
        ) : null}
        {person.mutualFriends.length ? (
          <p className="line-clamp-2 leading-5 text-neutral-500">
            Qua {person.mutualFriends.map((friend) => friend.fullName).join(", ")}
          </p>
        ) : null}
      </div>

      <div className="mt-auto pt-4">
        <FollowButton
          personId={person.personId}
          isFollowing={person.relationship.isFollowing}
          relationship={person.relationship}
          compact
        />
      </div>
    </Card>
  );
}
