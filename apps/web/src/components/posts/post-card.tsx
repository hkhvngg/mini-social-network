"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Earth,
  Flag,
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
import type { Post, PostPrivacy, RepostSource } from "@/lib/types";
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
    mutationFn: (nextLiked: boolean) =>
      api.request({
        url: `/posts/${post.postId}/like`,
        method: nextLiked ? "POST" : "DELETE",
      }),
    onSuccess: refresh,
    onError: (error) => toast.error(getApiError(error)),
  });
  const repost = useMutation({
    mutationFn: (nextReposted: boolean) =>
      api.request({
        url: `/posts/${post.postId}/repost`,
        method: nextReposted ? "POST" : "DELETE",
      }),
    onSuccess: async (_response, nextReposted) => {
      await refresh();
      toast.success(nextReposted ? "Đã đăng lại bài viết" : "Đã hoàn tác đăng lại");
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
      return canShare ? "shared" : "copied";
    },
    onSuccess: (result) => {
      toast.success(result === "shared" ? "Đã chia sẻ bài viết" : "Đã sao chép liên kết");
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
    mutationFn: (input: { content?: string; privacy?: PostPrivacy }) =>
      api.patch(`/posts/${post.postId}`, input),
    onSuccess: async () => {
      await refresh();
      toast.success("Đã cập nhật bài viết");
    },
    onError: (error) => toast.error(getApiError(error)),
  });
  const report = useMutation({
    mutationFn: (details: string) =>
      api.post("/reports", {
        targetType: "POST",
        targetId: post.postId,
        reason: "OTHER",
        details,
      }),
    onSuccess: () => toast.success("Đã gửi báo cáo đến quản trị viên"),
    onError: (error) => toast.error(getApiError(error)),
  });
  const PrivacyIcon = privacyIcon[post.privacy];
  const media = post.media?.[0];
  const liked = like.isPending ? like.variables : post.likedByCurrentUser;
  const likeCount =
    post.likeCount +
    (like.isPending && like.variables !== post.likedByCurrentUser
      ? like.variables
        ? 1
        : -1
      : 0);
  const reposted = repost.isPending
    ? repost.variables
    : post.repostedByCurrentUser;
  const repostCount = Math.max(0,
    post.repostCount +
    (repost.isPending && repost.variables !== post.repostedByCurrentUser
      ? repost.variables
        ? 1
        : -1
      : 0));

  function editPost() {
    const value = window.prompt("Chỉnh sửa nội dung", post.content)?.trim();
    if (value && value !== post.content) edit.mutate({ content: value });
  }

  function deletePost() {
    if (window.confirm("Xóa bài viết này?")) remove.mutate();
  }

  function reportPost() {
    const details = window.prompt("Bài viết này có vấn đề gì?")?.trim();
    if (details) report.mutate(details);
  }

  return (
    <Card className="overflow-hidden rounded-none border-x-0 border-t-0">
      <div className="p-4 sm:p-5">
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
          <Link href={`/profile/${post.author.username}`}>
            <Avatar name={post.author.fullName} src={post.author.avatarUrl} />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <Link href={`/profile/${post.author.username}`} className="block truncate text-sm font-bold hover:underline">
                  {post.author.fullName}
                </Link>
                <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-neutral-500">
                  <span className="max-w-full truncate">@{post.author.username}</span>
                  <Link href={`/post/${post.postId}`} className="whitespace-nowrap hover:underline">
                    · {relativeTime(post.createdAt)}
                  </Link>
                  <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap">
                    · <PrivacyIcon className="size-3" />
                  </span>
                  {post.repostOf ? <span className="whitespace-nowrap">· Đã đăng lại</span> : null}
                </div>
              </div>
              {!post.isAuthor ? (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Báo cáo bài viết"
                  className="shrink-0"
                  disabled={report.isPending}
                  onClick={reportPost}
                >
                  <Flag className="size-4 text-neutral-500" />
                  <MoreHorizontal className="sr-only" />
                </Button>
              ) : null}
            </div>
          </div>
          {post.isAuthor ? (
            <div className="col-start-2 mt-2 flex flex-wrap items-center gap-1 sm:col-start-3 sm:row-start-1 sm:mt-0 sm:flex-nowrap">
              <select
                aria-label="Quyền riêng tư của bài viết"
                value={post.privacy}
                disabled={edit.isPending}
                onChange={(event) => edit.mutate({ privacy: event.target.value as PostPrivacy })}
                className="h-9 min-w-24 rounded-lg border border-neutral-200 bg-transparent px-2 text-xs dark:border-neutral-700"
              >
                <option value="PUBLIC">Công khai</option>
                <option value="FRIENDS">Bạn bè</option>
                <option value="PRIVATE">Riêng tư</option>
              </select>
              <Button variant="ghost" size="icon" aria-label="Sửa bài" onClick={editPost}>
                <Pencil className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Xóa bài" onClick={deletePost}>
                <Trash2 className="size-4 text-rose-500" />
              </Button>
            </div>
          ) : null}
        </div>
        {post.content ? (
          <p className="mt-4 whitespace-pre-wrap text-[15px] leading-7 text-neutral-700 dark:text-neutral-200">
            {post.content}
          </p>
        ) : null}
        {post.repostOf ? <RepostSourceCard source={post.repostOf} /> : null}
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
          className={cn(liked && "text-rose-600")}
          disabled={like.isPending}
          onClick={() => like.mutate(!liked)}
        >
          <Heart className={cn("size-4", liked && "fill-current")} />
          <span>{likeCount}</span>
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
          className={cn(reposted && "text-emerald-600")}
          disabled={repost.isPending}
          onClick={() => repost.mutate(!reposted)}
        >
          <Repeat2 className="size-4" />
          <span>{repostCount}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Chia sẻ bài viết"
          disabled={share.isPending}
          onClick={() => share.mutate()}
        >
          <Share2 className="size-4" />
          <span>Chia sẻ</span>
        </Button>
      </div>
    </Card>
  );
}

function RepostSourceCard({ source }: { source: RepostSource }) {
  const sourceMedia = source.media?.[0];
  return (
    <Link
      href={`/post/${source.postId}`}
      className="mt-4 block overflow-hidden rounded-2xl border border-neutral-200 transition hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
    >
      <div className="p-4">
        <div className="flex items-center gap-2 text-sm">
          <Avatar name={source.author.fullName} src={source.author.avatarUrl} />
          <div className="min-w-0">
            <div className="truncate font-semibold">{source.author.fullName}</div>
            <div className="truncate text-xs text-neutral-500">
              @{source.author.username} · {relativeTime(source.createdAt)} · Xem bài gốc
            </div>
          </div>
        </div>
        {source.content ? (
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-neutral-700 dark:text-neutral-200">
            {source.content}
          </p>
        ) : null}
      </div>
      {sourceMedia?.resourceType === "video" ? (
        <video src={sourceMedia.secureUrl} controls preload="metadata" className="max-h-[460px] w-full bg-black" />
      ) : sourceMedia?.resourceType === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={sourceMedia.secureUrl} alt="Ảnh trong bài gốc" className="max-h-[460px] w-full object-cover" />
      ) : source.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={source.imageUrl} alt="Ảnh trong bài gốc" className="max-h-[460px] w-full object-cover" />
      ) : null}
    </Link>
  );
}
