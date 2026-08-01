"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Earth,
  Heart,
  LockKeyhole,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Repeat2,
  Share2,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Avatar } from "../ui/avatar";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { api, getApiError } from "@/lib/api";
import type { Post } from "@/lib/types";
import { cn, relativeTime } from "@/lib/utils";

const privacyIcon = {
  PUBLIC: Earth,
  FRIENDS: Users,
  PRIVATE: LockKeyhole,
};

export function PostCard({ post }: { post: Post }) {
  const queryClient = useQueryClient();
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["posts"] }),
      queryClient.invalidateQueries({ queryKey: ["profile"] }),
    ]);
  };
  const like = useMutation({
    mutationFn: () =>
      api.request({
        url: `/posts/${post.postId}/like`,
        method: post.likedByCurrentUser ? "DELETE" : "POST",
      }),
    onSuccess: refresh,
    onError: (error) => toast.error(getApiError(error)),
  });
  const repost = useMutation({
    mutationFn: () =>
      api.request({
        url: `/posts/${post.postId}/repost`,
        method: post.repostedByCurrentUser ? "DELETE" : "POST",
      }),
    onSuccess: async () => {
      await refresh();
      toast.success(post.repostedByCurrentUser ? "Đã hoàn tác đăng lại" : "Đã đăng lại bài viết");
    },
    onError: (error) => toast.error(getApiError(error)),
  });
  const share = useMutation({
    mutationFn: async () => {
      const url = `${window.location.origin}/post/${post.postId}`;
      const canShare = typeof navigator.share === "function";
      if (canShare) {
        await navigator.share({ title: "Misonet", text: post.content, url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      } else {
        window.prompt("Sao chép liên kết bài viết", url);
      }
      return api.post(`/posts/${post.postId}/share`, {
        channel: canShare ? "NATIVE" : "COPY",
      });
    },
    onSuccess: async () => {
      await refresh();
      toast.success("Đã chia sẻ bài viết");
    },
    onError: (error) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error(getApiError(error));
    },
  });
  const remove = useMutation({
    mutationFn: () => api.delete(`/posts/${post.postId}`),
    onSuccess: async () => {
      await refresh();
      toast.success("Đã xóa bài viết");
    },
    onError: (error) => toast.error(getApiError(error)),
  });
  const edit = useMutation({
    mutationFn: (content: string) => api.patch(`/posts/${post.postId}`, { content }),
    onSuccess: async () => {
      await refresh();
      toast.success("Đã cập nhật bài viết");
    },
    onError: (error) => toast.error(getApiError(error)),
  });
  const PrivacyIcon = privacyIcon[post.privacy];
  const media = post.media?.[0];

  function editPost() {
    const value = window.prompt("Chỉnh sửa nội dung", post.content)?.trim();
    if (value && value !== post.content) edit.mutate(value);
  }

  function deletePost() {
    if (window.confirm("Xóa bài viết này?")) remove.mutate();
  }

  return (
    <Card className="overflow-hidden rounded-none border-x-0 border-t-0">
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <Link href={`/profile/${post.author.username}`}>
            <Avatar name={post.author.fullName} src={post.author.avatarUrl} />
          </Link>
          <div className="min-w-0 flex-1">
            <Link href={`/profile/${post.author.username}`} className="block truncate text-sm font-bold hover:underline">
              {post.author.fullName}
            </Link>
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-neutral-500">
              <span>@{post.author.username}</span>
              <span>·</span>
              <Link href={`/post/${post.postId}`} className="hover:underline">
                {relativeTime(post.createdAt)}
              </Link>
              <span>·</span>
              <PrivacyIcon className="size-3" />
            </div>
          </div>
          {post.isAuthor ? (
            <div className="flex items-center">
              <Button variant="ghost" size="icon" aria-label="Sửa bài" onClick={editPost}>
                <Pencil className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Xóa bài" onClick={deletePost}>
                <Trash2 className="size-4 text-rose-500" />
              </Button>
            </div>
          ) : (
            <MoreHorizontal className="size-5 text-neutral-300" />
          )}
        </div>
        <p className="mt-4 whitespace-pre-wrap text-[15px] leading-7 text-neutral-700 dark:text-neutral-200">
          {post.content}
        </p>
      </div>
      {media?.resourceType === "video" ? (
        <video src={media.secureUrl} controls preload="metadata" className="max-h-[620px] w-full bg-black" />
      ) : media?.resourceType === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={media.secureUrl} alt="Ảnh trong bài viết" className="max-h-[620px] w-full object-cover" />
      ) : post.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.imageUrl} alt="Ảnh trong bài viết" className="max-h-[620px] w-full object-cover" />
      ) : null}
      <div className="grid grid-cols-4 border-t border-neutral-100 px-2 py-2 dark:border-neutral-800 sm:px-4">
        <Button
          variant="ghost"
          size="sm"
          aria-label="Thích bài viết"
          className={cn(post.likedByCurrentUser && "text-rose-600")}
          disabled={like.isPending}
          onClick={() => like.mutate()}
        >
          <Heart className={cn("size-4", post.likedByCurrentUser && "fill-current")} />
          <span>{post.likeCount}</span>
        </Button>
        <Button asChild variant="ghost" size="sm" aria-label="Xem bình luận">
          <Link href={`/post/${post.postId}`}>
            <MessageCircle className="size-4" />
            <span>{post.commentCount}</span>
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Đăng lại bài viết"
          className={cn(post.repostedByCurrentUser && "text-emerald-600")}
          disabled={repost.isPending}
          onClick={() => repost.mutate()}
        >
          <Repeat2 className="size-4" />
          <span>{post.repostCount}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Chia sẻ bài viết"
          disabled={share.isPending}
          onClick={() => share.mutate()}
        >
          <Share2 className="size-4" />
          <span>{post.shareCount}</span>
        </Button>
      </div>
    </Card>
  );
}
