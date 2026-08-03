"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, Flag } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState, PageLoading } from "@/components/ui/states";
import { api } from "@/lib/api";
import type { AdminReport } from "@/lib/types";

const reasonLabels: Record<string, string> = {
  SPAM: "Spam",
  HARASSMENT: "Quấy rối",
  HATE: "Thù ghét",
  VIOLENCE: "Bạo lực",
  OTHER: "Khác",
};
const reportStatusLabels: Record<string, string> = {
  PENDING: "Chờ xử lý",
  IN_REVIEW: "Đang xem xét",
  RESOLVED: "Đã giải quyết",
  REJECTED: "Đã bác bỏ",
};
const targetTypeLabels: Record<string, string> = {
  PERSON: "Người dùng",
  POST: "Bài viết",
  COMMENT: "Bình luận",
};

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
}

export default function AdminReportDetailPage() {
  const params = useParams<{ reportId: string }>();
  const router = useRouter();
  const { user, loading } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const report = useQuery({
    queryKey: ["admin", "reports", "detail", params.reportId],
    queryFn: async () => (await api.get<AdminReport>(`/admin/reports/${params.reportId}`)).data,
    enabled: isAdmin && Boolean(params.reportId),
  });

  useEffect(() => {
    if (!loading && user && !isAdmin) router.replace("/feed");
  }, [isAdmin, loading, router, user]);

  if (loading || (user && !isAdmin)) return <div className="p-5"><PageLoading /></div>;

  const item = report.data;
  const originalHref = item?.targetType === "POST"
    ? `/post/${item.targetId}`
    : item?.targetType === "COMMENT" && item.targetPostId
      ? `/post/${item.targetPostId}#comment-${item.targetId}`
      : item?.targetAuthor
        ? `/profile/${item.targetAuthor.username}`
        : null;

  return (
    <section className="min-h-screen border-x border-neutral-200 dark:border-neutral-800">
      <header className="sticky top-14 z-20 flex h-14 items-center gap-3 border-b border-neutral-200 bg-white/90 px-3 backdrop-blur dark:border-neutral-800 dark:bg-black/90 lg:top-0">
        <Button variant="ghost" size="icon" aria-label="Quay lại" onClick={() => router.back()}>
          <ArrowLeft className="size-5" />
        </Button>
        <h1 className="font-bold">Chi tiết báo cáo</h1>
      </header>

      <div className="space-y-4 p-4 sm:p-6">
        {report.isLoading ? <PageLoading /> : null}
        {report.isError ? <ErrorState message="Chưa mở được báo cáo này. Báo cáo có thể không còn tồn tại hoặc bạn không có quyền xem." /> : null}
        {item ? (
          <>
            <Card className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2"><Flag className="size-4" /><strong>{reportStatusLabels[item.status]}</strong></div>
                <time className="text-xs text-neutral-500">{formatDate(item.createdAt)}</time>
              </div>
              <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                <div><dt className="text-neutral-500">Lý do</dt><dd className="mt-1 font-semibold">{reasonLabels[item.reason] ?? item.reason}</dd></div>
                <div><dt className="text-neutral-500">Người báo cáo</dt><dd className="mt-1 font-semibold">@{item.reporter.username}</dd></div>
                <div><dt className="text-neutral-500">Người xử lý</dt><dd className="mt-1 font-semibold">{item.assignee ? `@${item.assignee.username}` : "Chưa phân công"}</dd></div>
                <div><dt className="text-neutral-500">Thời điểm xử lý</dt><dd className="mt-1 font-semibold">{formatDate(item.resolvedAt ?? item.reviewedAt)}</dd></div>
              </dl>
              {item.details ? <p className="mt-5 rounded-xl bg-neutral-100 p-4 text-sm dark:bg-neutral-900">Mô tả: {item.details}</p> : null}
              {item.resolutionNote ? <p className="mt-3 rounded-xl border p-4 text-sm">Kết luận: {item.resolutionNote}</p> : null}
            </Card>

            <Card className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5 dark:border-neutral-800">
                <div><p className="text-xs uppercase tracking-widest text-neutral-500">Nội dung bị báo cáo</p><h2 className="mt-1 font-bold">{targetTypeLabels[item.targetType]}{item.targetAuthor ? ` của @${item.targetAuthor.username}` : ""}</h2></div>
                {originalHref ? <Button asChild variant="outline" size="sm"><Link href={originalHref}>Mở nội dung gốc <ExternalLink className="size-4" /></Link></Button> : null}
              </div>
              <p className="whitespace-pre-wrap p-5 text-[15px] leading-7">{item.targetContent || "Nội dung trống"}</p>
              {item.targetMediaType === "video" && item.targetMediaUrl ? <video src={item.targetMediaUrl} controls preload="metadata" className="max-h-[620px] w-full bg-black" /> : null}
              {item.targetMediaType === "image" && item.targetMediaUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.targetMediaUrl} alt="Ảnh đính kèm trong nội dung bị báo cáo" className="max-h-[620px] w-full object-contain bg-neutral-100 dark:bg-neutral-900" />
              ) : null}
            </Card>
          </>
        ) : null}
      </div>
    </section>
  );
}
