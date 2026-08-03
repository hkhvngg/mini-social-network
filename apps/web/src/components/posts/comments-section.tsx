"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Flag, Pencil, Reply, Send, Trash2, X } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../auth/auth-provider";
import { Avatar } from "../ui/avatar";
import { Button } from "../ui/button";
import { EmptyState, ErrorState, PageLoading } from "../ui/states";
import { api, getApiError } from "@/lib/api";
import type { Comment } from "@/lib/types";
import { relativeTime } from "@/lib/utils";

type CommentNode = Comment & { replies: CommentNode[] };

function buildCommentTree(comments: Comment[]): CommentNode[] {
  const nodes = new Map<string, CommentNode>();
  comments.forEach((comment) => nodes.set(comment.commentId, { ...comment, replies: [] }));
  const roots: CommentNode[] = [];
  nodes.forEach((node) => {
    const parent = node.parentCommentId ? nodes.get(node.parentCommentId) : undefined;
    if (parent) parent.replies.push(node);
    else roots.push(node);
  });
  return roots;
}

export function CommentsSection({ postId }: { postId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const comments = useQuery({
    queryKey: ["comments", postId],
    queryFn: async () =>
      (await api.get<Comment[]>(`/posts/${postId}/comments?limit=100`)).data,
  });
  const commentTree = useMemo(() => buildCommentTree(comments.data ?? []), [comments.data]);
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["comments", postId] }),
      queryClient.invalidateQueries({ queryKey: ["posts"] }),
    ]);
  };
  const create = useMutation({
    mutationFn: () => api.post(`/posts/${postId}/comments`, {
      content,
      ...(replyingTo ? { parentCommentId: replyingTo.commentId } : {}),
    }),
    onSuccess: async () => {
      setContent("");
      setReplyingTo(null);
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
    mutationFn: (commentId: string) => api.delete(`/posts/${postId}/comments/${commentId}`),
    onSuccess: refresh,
    onError: (error) => toast.error(getApiError(error)),
  });
  const report = useMutation({
    mutationFn: ({ commentId, details }: { commentId: string; details: string }) =>
      api.post("/reports", {
        targetType: "COMMENT",
        targetId: commentId,
        reason: "OTHER",
        details,
      }),
    onSuccess: () => toast.success("Đã gửi báo cáo đến quản trị viên"),
    onError: (error) => toast.error(getApiError(error)),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (content.trim()) create.mutate();
  }

  function editComment(comment: Comment) {
    const value = window.prompt("Chỉnh sửa bình luận", comment.content)?.trim();
    if (value && value !== comment.content) update.mutate({ commentId: comment.commentId, value });
  }

  function deleteComment(commentId: string) {
    if (window.confirm("Xóa bình luận này và toàn bộ câu trả lời?")) remove.mutate(commentId);
  }

  function reportComment(commentId: string) {
    const details = window.prompt("Bình luận này có vấn đề gì?")?.trim();
    if (details) report.mutate({ commentId, details });
  }

  return (
    <section aria-labelledby="comments-title">
      <h2 id="comments-title" className="border-b border-neutral-200 px-4 py-4 text-base font-bold dark:border-neutral-800 sm:px-5">
        Bình luận
      </h2>
      <form onSubmit={submit} className="flex items-start gap-3 border-b border-neutral-200 p-4 dark:border-neutral-800 sm:p-5">
        <Avatar name={user?.fullName ?? "Misonet"} src={user?.avatarUrl} />
        <div className="min-w-0 flex-1">
          {replyingTo ? (
            <div className="mb-2 flex items-center justify-between rounded-lg bg-neutral-100 px-3 py-2 text-xs dark:bg-neutral-900">
              <span>Đang trả lời <strong>{replyingTo.author.fullName}</strong></span>
              <button type="button" aria-label="Hủy trả lời" onClick={() => setReplyingTo(null)}><X className="size-4" /></button>
            </div>
          ) : null}
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            maxLength={2000}
            rows={2}
            placeholder={replyingTo ? `Trả lời ${replyingTo.author.fullName}...` : "Viết bình luận..."}
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
      {comments.isError ? <div className="p-4"><ErrorState message="Bình luận chưa tải được. Bạn thử lại nhé." /></div> : null}
      {!comments.isLoading && !comments.data?.length ? (
        <div className="p-4"><EmptyState title="Chưa có bình luận" description="Bạn có thể là người đầu tiên trò chuyện về bài viết này." /></div>
      ) : null}
      <div>
        {commentTree.map((comment) => (
          <CommentItem
            key={comment.commentId}
            comment={comment}
            depth={0}
            onReply={setReplyingTo}
            onEdit={editComment}
            onDelete={deleteComment}
            onReport={reportComment}
            deleting={remove.isPending}
          />
        ))}
      </div>
    </section>
  );
}

function CommentItem({
  comment,
  depth,
  onReply,
  onEdit,
  onDelete,
  onReport,
  deleting,
}: {
  comment: CommentNode;
  depth: number;
  onReply: (comment: Comment) => void;
  onEdit: (comment: Comment) => void;
  onDelete: (commentId: string) => void;
  onReport: (commentId: string) => void;
  deleting: boolean;
}) {
  return (
    <div className={depth ? "ml-7 border-l border-neutral-200 pl-3 dark:border-neutral-800 sm:ml-12" : ""}>
      <article id={`comment-${comment.commentId}`} className="flex scroll-mt-24 gap-3 border-b border-neutral-100 p-4 dark:border-neutral-900 sm:p-5">
        <Avatar name={comment.author.fullName} src={comment.author.avatarUrl} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold">{comment.author.fullName}</span>
            <span className="truncate text-xs text-neutral-500">@{comment.author.username} · {relativeTime(comment.createdAt)}</span>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-neutral-700 dark:text-neutral-200">{comment.content}</p>
          <button type="button" onClick={() => onReply(comment)} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-neutral-500 hover:text-black dark:hover:text-white">
            <Reply className="size-3" /> Trả lời
          </button>
        </div>
        {comment.isAuthor ? (
          <div className="flex">
            <Button variant="ghost" size="icon" aria-label="Sửa bình luận" onClick={() => onEdit(comment)}><Pencil className="size-4" /></Button>
            <Button variant="ghost" size="icon" aria-label="Xóa bình luận" disabled={deleting} onClick={() => onDelete(comment.commentId)}><Trash2 className="size-4 text-rose-500" /></Button>
          </div>
        ) : (
          <Button variant="ghost" size="icon" aria-label="Báo cáo bình luận" onClick={() => onReport(comment.commentId)}>
            <Flag className="size-4 text-neutral-500" />
          </Button>
        )}
      </article>
      {comment.replies.map((reply) => (
        <CommentItem key={reply.commentId} comment={reply} depth={depth + 1} onReply={onReply} onEdit={onEdit} onDelete={onDelete} onReport={onReport} deleting={deleting} />
      ))}
    </div>
  );
}
