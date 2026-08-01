"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Send, Trash2 } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../auth/auth-provider";
import { Avatar } from "../ui/avatar";
import { Button } from "../ui/button";
import { EmptyState, ErrorState, PageLoading } from "../ui/states";
import { api, getApiError } from "@/lib/api";
import type { Comment } from "@/lib/types";
import { relativeTime } from "@/lib/utils";

export function CommentsSection({ postId }: { postId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const comments = useQuery({
    queryKey: ["comments", postId],
    queryFn: async () =>
      (await api.get<Comment[]>(`/posts/${postId}/comments?limit=100`)).data,
  });
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["comments", postId] }),
      queryClient.invalidateQueries({ queryKey: ["posts"] }),
    ]);
  };
  const create = useMutation({
    mutationFn: () => api.post(`/posts/${postId}/comments`, { content }),
    onSuccess: async () => {
      setContent("");
      await refresh();
    },
    onError: (error) => toast.error(getApiError(error)),
  });
  const update = useMutation({
    mutationFn: ({ commentId, value }: { commentId: string; value: string }) =>
      api.patch(`/posts/${postId}/comments/${commentId}`, { content: value }),
    onSuccess: refresh,
    onError: (error) => toast.error(getApiError(error)),
  });
  const remove = useMutation({
    mutationFn: (commentId: string) =>
      api.delete(`/posts/${postId}/comments/${commentId}`),
    onSuccess: refresh,
    onError: (error) => toast.error(getApiError(error)),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (content.trim()) create.mutate();
  }

  function editComment(comment: Comment) {
    const value = window.prompt("Chỉnh sửa bình luận", comment.content)?.trim();
    if (value && value !== comment.content) {
      update.mutate({ commentId: comment.commentId, value });
    }
  }

  return (
    <section aria-labelledby="comments-title">
      <h2 id="comments-title" className="border-b border-neutral-200 px-4 py-4 text-base font-bold dark:border-neutral-800 sm:px-5">
        Bình luận
      </h2>
      <form onSubmit={submit} className="flex items-start gap-3 border-b border-neutral-200 p-4 dark:border-neutral-800 sm:p-5">
        <Avatar name={user?.fullName ?? "Misonet"} src={user?.avatarUrl} />
        <div className="min-w-0 flex-1">
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            maxLength={2000}
            rows={2}
            placeholder="Viết bình luận..."
            className="w-full resize-none rounded-xl border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-black dark:border-neutral-700 dark:focus:border-white"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-neutral-500">{content.length}/2000</span>
            <Button type="submit" size="sm" disabled={!content.trim() || create.isPending}>
              <Send className="size-4" /> Gửi
            </Button>
          </div>
        </div>
      </form>

      {comments.isLoading ? <div className="p-4"><PageLoading /></div> : null}
      {comments.isError ? <div className="p-4"><ErrorState message="Không thể tải bình luận." /></div> : null}
      {!comments.isLoading && !comments.data?.length ? (
        <div className="p-4"><EmptyState title="Chưa có bình luận" description="Hãy bắt đầu cuộc trò chuyện về bài viết này." /></div>
      ) : null}
      <div>
        {comments.data?.map((comment) => (
          <article key={comment.commentId} className="flex gap-3 border-b border-neutral-100 p-4 dark:border-neutral-900 sm:p-5">
            <Avatar name={comment.author.fullName} src={comment.author.avatarUrl} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-semibold">{comment.author.fullName}</span>
                <span className="truncate text-xs text-neutral-500">@{comment.author.username} · {relativeTime(comment.createdAt)}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-neutral-700 dark:text-neutral-200">{comment.content}</p>
            </div>
            {comment.isAuthor ? (
              <div className="flex">
                <Button variant="ghost" size="icon" aria-label="Sửa bình luận" onClick={() => editComment(comment)}>
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Xóa bình luận"
                  disabled={remove.isPending}
                  onClick={() => window.confirm("Xóa bình luận này?") && remove.mutate(comment.commentId)}
                >
                  <Trash2 className="size-4 text-rose-500" />
                </Button>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
