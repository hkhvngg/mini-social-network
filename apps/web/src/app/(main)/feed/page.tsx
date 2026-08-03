"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PostComposer } from "@/components/posts/post-composer";
import { PostCard } from "@/components/posts/post-card";
import { EmptyState, ErrorState, PageLoading } from "@/components/ui/states";
import { useAuth } from "@/components/auth/auth-provider";
import { api } from "@/lib/api";
import type { Connection, Post } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function FeedPage() {
  const [tab, setTab] = useState<"for-you" | "following">("for-you");
  const { user } = useAuth();
  const feed = useQuery({
    queryKey: ["posts", "feed"],
    queryFn: async () => (await api.get<Post[]>("/posts/feed?limit=50")).data,
  });
  const following = useQuery({
    queryKey: ["connections", "me", "following", "feed-filter"],
    queryFn: async () =>
      (await api.get<Connection[]>("/users/me/following?limit=100")).data,
    enabled: tab === "following",
  });
  const followingIds = new Set(following.data?.map((person) => person.personId));
  const visiblePosts =
    tab === "following"
      ? feed.data?.filter(
          (post) =>
            post.author.personId === user?.personId ||
            followingIds.has(post.author.personId),
        )
      : feed.data;

  return (
    <section className="min-h-screen border-x border-neutral-200 dark:border-neutral-800">
      <header className="sticky top-14 z-20 border-b border-neutral-200 bg-white/90 backdrop-blur dark:border-neutral-800 dark:bg-black/90 lg:top-0">
        <h1 className="sr-only">Bảng tin Misonet</h1>
        <div className="grid grid-cols-2">
          {[
            ["for-you", "Dành cho bạn"],
            ["following", "Đang theo dõi"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value as "for-you" | "following")}
              className={cn(
                "relative h-14 text-sm font-semibold text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-950",
                tab === value && "text-black dark:text-white",
              )}
            >
              {label}
              {tab === value ? (
                <span className="absolute inset-x-1/3 bottom-0 h-0.5 rounded-full bg-black dark:bg-white" />
              ) : null}
            </button>
          ))}
        </div>
      </header>

      <div id="composer" className="border-b border-neutral-200 dark:border-neutral-800">
        <PostComposer />
      </div>

      {feed.isLoading || (tab === "following" && following.isLoading) ? (
        <div className="p-4"><PageLoading /></div>
      ) : null}
      {feed.isError || following.isError ? (
        <div className="p-4"><ErrorState message="Bảng tin chưa tải được. Bạn thử lại nhé." /></div>
      ) : null}
      {!feed.isLoading && !visiblePosts?.length ? (
        <div className="p-4 sm:p-6">
          <EmptyState
            title={tab === "following" ? "Chưa có bài viết mới" : "Bảng tin đang yên ắng"}
            description={
              tab === "following"
                ? "Theo dõi thêm những người bạn quan tâm để xem bài viết của họ tại đây."
                : "Bạn có thể chia sẻ bài viết đầu tiên hoặc tìm thêm bạn mới."
            }
          />
        </div>
      ) : null}
      <div>
        {visiblePosts?.map((post) => <PostCard key={post.postId} post={post} />)}
      </div>
    </section>
  );
}
