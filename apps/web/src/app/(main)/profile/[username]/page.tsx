"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarDays, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { EditProfileDialog } from "@/components/profile/edit-profile-dialog";
import { PostCard } from "@/components/posts/post-card";
import { FollowButton } from "@/components/social/follow-button";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState, ErrorState, PageLoading } from "@/components/ui/states";
import { api } from "@/lib/api";
import type { Post, Profile } from "@/lib/types";

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const username = decodeURIComponent(params.username);
  const profile = useQuery({
    queryKey: ["profile", username],
    queryFn: async () => (await api.get<Profile>(`/users/${username}`)).data,
  });
  const posts = useQuery({
    queryKey: ["posts", "user", username],
    queryFn: async () =>
      (await api.get<Post[]>(`/posts/user/${username}?limit=50`)).data,
  });

  if (profile.isLoading) return <PageLoading />;
  if (profile.isError || !profile.data) {
    return <ErrorState message="Không tìm thấy hồ sơ này." />;
  }
  const person = profile.data;
  const connectionBase = `/profile/${person.username}/connections`;

  return (
    <section className="min-h-[70vh] border-x border-neutral-200 dark:border-neutral-800">
      <div className="border-b border-neutral-200 px-4 py-6 dark:border-neutral-800 sm:px-6">
        <div className="flex items-start justify-between gap-5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-bold tracking-tight">
                {person.fullName}
              </h1>
              {person.isPrivate ? (
                <LockKeyhole className="size-4 text-neutral-500" aria-label="Profile riêng tư" />
              ) : null}
            </div>
            <p className="mt-1 text-[15px] text-neutral-600 dark:text-neutral-400">
              @{person.username}
            </p>
            <p className="mt-4 max-w-lg whitespace-pre-wrap text-[15px] leading-6">
              {person.bio || "Chưa có phần giới thiệu."}
            </p>
          </div>
          <Avatar
            name={person.fullName}
            src={person.avatarUrl}
            className="size-20 sm:size-24"
          />
        </div>

        <div className="mt-5 flex items-center gap-3 text-sm text-neutral-500">
          <CalendarDays className="size-4" />
          Tham gia {new Intl.DateTimeFormat("vi-VN", { month: "long", year: "numeric" }).format(new Date(person.createdAt))}
        </div>

        <div className="mt-5">
          {person.relationship.isSelf ? (
            <EditProfileDialog profile={person} />
          ) : (
            <FollowButton
              personId={person.personId}
              isFollowing={person.relationship.isFollowing}
              relationship={person.relationship}
            />
          )}
        </div>

        <div className="mt-6 grid grid-cols-4 border-y border-neutral-200 dark:border-neutral-800">
          <Stat href="#posts" value={person.stats.postCount} label="Bài viết" />
          <Stat
            href={person.relationship.isSelf ? "/friends" : `${connectionBase}?tab=friends`}
            value={person.stats.friendCount}
            label="Bạn bè"
            locked={!person.canViewConnections}
          />
          <Stat
            href={person.relationship.isSelf ? "/followers" : `${connectionBase}?tab=followers`}
            value={person.stats.followerCount}
            label="Follower"
            locked={!person.canViewConnections}
          />
          <Stat
            href={person.relationship.isSelf ? "/following" : `${connectionBase}?tab=following`}
            value={person.stats.followingCount}
            label="Following"
            locked={!person.canViewConnections}
          />
        </div>

        {!person.canViewConnections ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-neutral-500">
            <LockKeyhole className="size-4" /> Người dùng này giữ danh sách kết nối ở chế độ riêng tư.
          </p>
        ) : null}
      </div>

      <div id="posts" className="border-b border-neutral-200 px-4 py-4 dark:border-neutral-800 sm:px-6">
        <h2 className="text-center text-sm font-semibold">Bài viết</h2>
      </div>
      {posts.isLoading ? <div className="p-4"><PageLoading /></div> : null}
      {posts.isError ? <div className="p-4"><ErrorState message="Không thể tải bài viết." /></div> : null}
      {!posts.isLoading && !posts.data?.length ? (
        <div className="p-4 sm:p-6">
          <EmptyState
            title="Chưa có bài viết"
            description="Những chia sẻ mới sẽ xuất hiện tại đây."
          />
        </div>
      ) : null}
      <div>
        {posts.data?.map((post) => <PostCard key={post.postId} post={post} />)}
      </div>
    </section>
  );
}

function Stat({
  href,
  value,
  label,
  locked = false,
}: {
  href: string;
  value: number;
  label: string;
  locked?: boolean;
}) {
  const content = (
    <>
      <span className="flex items-center justify-center gap-1 text-base font-bold">
        {locked ? <LockKeyhole className="size-3.5" /> : value}
      </span>
      <span className="mt-0.5 block text-[11px] text-neutral-500">{label}</span>
    </>
  );

  return locked ? (
    <div className="border-r border-neutral-200 px-1 py-3 text-center last:border-r-0 dark:border-neutral-800">
      {content}
    </div>
  ) : (
    <Link
      href={href}
      className="border-r border-neutral-200 px-1 py-3 text-center transition hover:bg-neutral-50 last:border-r-0 dark:border-neutral-800 dark:hover:bg-neutral-950"
    >
      {content}
    </Link>
  );
}
