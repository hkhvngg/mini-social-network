"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, PageLoading } from "@/components/ui/states";
import { api, getApiError } from "@/lib/api";
import type { Notification } from "@/lib/types";
import { cn, relativeTime } from "@/lib/utils";
import { toast } from "sonner";

const messages: Record<Notification["type"], string> = {
  FOLLOW: "đã theo dõi bạn",
  FRIEND: "đã trở thành bạn bè với bạn",
  LIKE: "đã thích bài viết của bạn",
  COMMENT: "đã bình luận bài viết của bạn",
  REPLY: "đã trả lời bình luận của bạn",
  REPOST: "đã đăng lại bài viết của bạn",
  SHARE: "đã chia sẻ bài viết của bạn",
};

export default function ActivityPage() {
  const queryClient = useQueryClient();
  const notifications = useQuery({
    queryKey: ["notifications"],
    queryFn: async () =>
      (await api.get<Notification[]>("/notifications?limit=100")).data,
  });
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["notifications"] }),
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] }),
    ]);
  };
  const markRead = useMutation({
    mutationFn: (notificationId: string) =>
      api.patch(`/notifications/${notificationId}/read`),
    onSuccess: refresh,
    onError: (error) => toast.error(getApiError(error)),
  });
  const markAllRead = useMutation({
    mutationFn: () => api.patch("/notifications/read-all"),
    onSuccess: refresh,
    onError: (error) => toast.error(getApiError(error)),
  });

  return (
    <section className="min-h-[70vh] border-x border-neutral-200 dark:border-neutral-800">
      <header className="flex items-center justify-between border-b border-neutral-200 px-4 py-5 dark:border-neutral-800 sm:px-6">
        <div>
          <h1 className="text-xl font-bold">Thông báo</h1>
          <p className="mt-1 text-sm text-neutral-500">Xem những tương tác mới liên quan đến bạn.</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          disabled={markAllRead.isPending || !notifications.data?.some((item) => !item.isRead)}
          onClick={() => markAllRead.mutate()}
        >
          <CheckCheck className="size-4" /> Đánh dấu đã đọc
        </Button>
      </header>

      {notifications.isLoading ? <div className="p-5"><PageLoading /></div> : null}
      {notifications.isError ? <div className="p-5"><ErrorState message="Thông báo chưa tải được. Bạn thử lại nhé." /></div> : null}
      {!notifications.isLoading && !notifications.data?.length ? (
        <div className="px-4 py-16 sm:px-6">
          <div className="mx-auto mb-5 grid size-14 place-items-center rounded-full border border-neutral-200 dark:border-neutral-800"><Bell className="size-6" /></div>
          <EmptyState title="Chưa có thông báo mới" description="Khi có người theo dõi, thích hoặc trò chuyện với bạn, thông báo sẽ xuất hiện ở đây." />
        </div>
      ) : null}
      <div>
        {notifications.data?.map((notification) => {
          const href = notification.postId
            ? `/post/${notification.postId}`
            : `/profile/${notification.actor.username}`;
          return (
            <Link
              key={notification.notificationId}
              href={href}
              onClick={() => {
                if (!notification.isRead) markRead.mutate(notification.notificationId);
              }}
              className={cn(
                "flex gap-3 border-b border-neutral-100 p-4 transition hover:bg-neutral-50 dark:border-neutral-900 dark:hover:bg-neutral-950 sm:p-5",
                !notification.isRead && "bg-blue-50/60 dark:bg-blue-950/20",
              )}
            >
              <Avatar name={notification.actor.fullName} src={notification.actor.avatarUrl} />
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-6">
                  <strong>{notification.actor.fullName}</strong>{" "}{messages[notification.type]}
                </p>
                {notification.commentPreview ? (
                  <p className="mt-1 line-clamp-2 text-sm text-neutral-500">“{notification.commentPreview}”</p>
                ) : notification.postPreview ? (
                  <p className="mt-1 line-clamp-2 text-sm text-neutral-500">{notification.postPreview}</p>
                ) : null}
                <span className="mt-1 block text-xs text-neutral-500">{relativeTime(notification.createdAt)}</span>
              </div>
              {!notification.isRead ? <span className="mt-2 size-2 shrink-0 rounded-full bg-blue-600" aria-label="Chưa đọc" /> : null}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
