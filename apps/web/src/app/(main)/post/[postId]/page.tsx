"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { CommentsSection } from "@/components/posts/comments-section";
import { PostCard } from "@/components/posts/post-card";
import { Button } from "@/components/ui/button";
import { ErrorState, PageLoading } from "@/components/ui/states";
import { api } from "@/lib/api";
import type { Post } from "@/lib/types";

export default function PostDetailPage() {
  const params = useParams<{ postId: string }>();
  const router = useRouter();
  const post = useQuery({
    queryKey: ["posts", "detail", params.postId],
    queryFn: async () => (await api.get<Post>(`/posts/${params.postId}`)).data,
    enabled: Boolean(params.postId),
  });

  return (
    <section className="min-h-screen border-x border-neutral-200 dark:border-neutral-800">
      <header className="sticky top-14 z-20 flex h-14 items-center gap-3 border-b border-neutral-200 bg-white/90 px-3 backdrop-blur dark:border-neutral-800 dark:bg-black/90 lg:top-0">
        <Button variant="ghost" size="icon" aria-label="Quay lại" onClick={() => router.back()}>
          <ArrowLeft className="size-5" />
        </Button>
        <h1 className="font-bold">Bài viết</h1>
      </header>
      {post.isLoading ? <div className="p-5"><PageLoading /></div> : null}
      {post.isError ? <div className="p-5"><ErrorState message="Không thể tải bài viết hoặc bạn không có quyền xem." /></div> : null}
      {post.data ? (
        <>
          <PostCard post={post.data} />
          <CommentsSection postId={post.data.postId} />
        </>
      ) : null}
    </section>
  );
}
