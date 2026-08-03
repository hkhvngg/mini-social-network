"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  FileText,
  Flag,
  Heart,
  History,
  MessageSquare,
  Network,
  Repeat2,
  ShieldCheck,
  UserCheck,
  UserRoundX,
  Users,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/auth-provider";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState, PageLoading } from "@/components/ui/states";
import { api, getApiError } from "@/lib/api";
import type {
  AdminAudit,
  AdminContent,
  AdminGraphOverview,
  AdminOverview,
  AdminRanking,
  AdminReport,
  AdminUser,
  Paginated,
} from "@/lib/types";

type Tab = "overview" | "reports" | "users" | "content" | "graph" | "audit";
type AccountStatus = AdminUser["accountStatus"];
type ModerationStatus = AdminContent["moderationStatus"];

const pageSize = 20;
const reasonLabels: Record<string, string> = {
  SPAM: "Spam",
  HARASSMENT: "Quấy rối",
  HATE: "Thù ghét",
  VIOLENCE: "Bạo lực",
  OTHER: "Khác",
};
const accountStatusLabels: Record<string, string> = {
  ACTIVE: "Đang hoạt động",
  SUSPENDED: "Tạm ngưng",
  BANNED: "Đã khóa",
};
const roleLabels: Record<string, string> = {
  USER: "Thành viên",
  ADMIN: "Quản trị viên",
};
const moderationStatusLabels: Record<string, string> = {
  VISIBLE: "Đang hiển thị",
  HIDDEN: "Đang ẩn",
  REMOVED: "Đã gỡ",
};
const reportStatusLabels: Record<string, string> = {
  PENDING: "Chờ xử lý",
  IN_REVIEW: "Đang xem xét",
  RESOLVED: "Đã giải quyết",
  REJECTED: "Đã bác bỏ",
};
const contentTypeLabels: Record<string, string> = {
  POST: "Bài viết",
  COMMENT: "Bình luận",
  PERSON: "Người dùng",
  REPORT: "Báo cáo",
};
const auditActionLabels: Record<string, string> = {
  SUSPEND_USER: "Tạm ngưng tài khoản",
  UNSUSPEND_USER: "Mở lại tài khoản",
  BAN_USER: "Khóa tài khoản",
  UNBAN_USER: "Mở khóa tài khoản",
  CHANGE_USER_ROLE: "Thay đổi quyền tài khoản",
  HIDE_POST: "Ẩn bài viết",
  REMOVE_POST: "Gỡ bài viết",
  RESTORE_POST: "Khôi phục bài viết",
  HIDE_COMMENT: "Ẩn bình luận",
  REMOVE_COMMENT: "Gỡ bình luận",
  RESTORE_COMMENT: "Khôi phục bình luận",
  ASSIGN_REPORT: "Nhận xử lý báo cáo",
  RESOLVE_REPORT: "Giải quyết báo cáo",
  REJECT_REPORT: "Bác bỏ báo cáo",
};

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("overview");
  const [userSearchInput, setUserSearchInput] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [userStatus, setUserStatus] = useState("");
  const [userRole, setUserRole] = useState("");
  const [userPage, setUserPage] = useState(1);
  const [contentSearchInput, setContentSearchInput] = useState("");
  const [contentSearch, setContentSearch] = useState("");
  const [contentType, setContentType] = useState<"POST" | "COMMENT">("POST");
  const [contentStatus, setContentStatus] = useState("");
  const [contentPage, setContentPage] = useState(1);
  const [reportStatus, setReportStatus] = useState("");
  const [reportPage, setReportPage] = useState(1);
  const [auditPage, setAuditPage] = useState(1);
  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    if (user && !isAdmin) router.replace("/feed");
  }, [isAdmin, router, user]);

  const overview = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: async () => (await api.get<AdminOverview>("/admin/overview")).data,
    enabled: isAdmin,
  });
  const users = useQuery({
    queryKey: ["admin", "users", userSearch, userStatus, userRole, userPage],
    queryFn: async () => {
      const params = new URLSearchParams({
        q: userSearch,
        page: String(userPage),
        limit: String(pageSize),
      });
      if (userStatus) params.set("status", userStatus);
      if (userRole) params.set("role", userRole);
      return (await api.get<Paginated<AdminUser>>(`/admin/users?${params}`)).data;
    },
    enabled: isAdmin && tab === "users",
  });
  const reports = useQuery({
    queryKey: ["admin", "reports", reportStatus, reportPage],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(reportPage), limit: String(pageSize) });
      if (reportStatus) params.set("status", reportStatus);
      return (await api.get<Paginated<AdminReport>>(`/admin/reports?${params}`)).data;
    },
    enabled: isAdmin && tab === "reports",
  });
  const content = useQuery({
    queryKey: ["admin", "content", contentType, contentStatus, contentSearch, contentPage],
    queryFn: async () => {
      const params = new URLSearchParams({
        type: contentType,
        q: contentSearch,
        page: String(contentPage),
        limit: String(pageSize),
      });
      if (contentStatus) params.set("status", contentStatus);
      return (await api.get<Paginated<AdminContent>>(`/admin/content?${params}`)).data;
    },
    enabled: isAdmin && tab === "content",
  });
  const graph = useQuery({
    queryKey: ["admin", "graph"],
    queryFn: async () =>
      (await api.get<AdminGraphOverview>("/admin/graph-overview?limit=10")).data,
    enabled: isAdmin && tab === "graph",
  });
  const audit = useQuery({
    queryKey: ["admin", "audit", auditPage],
    queryFn: async () =>
      (
        await api.get<Paginated<AdminAudit>>(
          `/admin/audit-logs?page=${auditPage}&limit=${pageSize}`,
        )
      ).data,
    enabled: isAdmin && tab === "audit",
  });

  const refresh = async () => queryClient.invalidateQueries({ queryKey: ["admin"] });
  const changeStatus = useMutation({
    mutationFn: ({ personId, status, note }: { personId: string; status: AccountStatus; note: string }) =>
      api.patch(`/admin/users/${personId}/status`, { status, note }),
    onSuccess: async () => {
      await refresh();
      toast.success("Đã cập nhật trạng thái tài khoản");
    },
    onError: (error) => toast.error(getApiError(error)),
  });
  const changeRole = useMutation({
    mutationFn: ({ personId, role }: { personId: string; role: "USER" | "ADMIN" }) =>
      api.patch(`/admin/users/${personId}/role`, { role }),
    onSuccess: async () => {
      await refresh();
      toast.success("Đã cập nhật quyền tài khoản");
    },
    onError: (error) => toast.error(getApiError(error)),
  });
  const moderate = useMutation({
    mutationFn: ({ item, status, reason }: { item: AdminContent; status: ModerationStatus; reason: string }) =>
      api.patch(
        item.type === "POST"
          ? `/admin/content/posts/${item.contentId}`
          : `/admin/content/comments/${item.contentId}`,
        { status, reason },
      ),
    onSuccess: async () => {
      await refresh();
      toast.success("Đã cập nhật trạng thái nội dung");
    },
    onError: (error) => toast.error(getApiError(error)),
  });
  const assignReport = useMutation({
    mutationFn: (reportId: string) => api.post(`/admin/reports/${reportId}/assign`),
    onSuccess: async () => {
      await refresh();
      toast.success("Bạn đang phụ trách báo cáo này");
    },
    onError: (error) => toast.error(getApiError(error)),
  });
  const resolveReport = useMutation({
    mutationFn: ({ reportId, status, note }: { reportId: string; status: "RESOLVED" | "REJECTED"; note: string }) =>
      api.patch(`/admin/reports/${reportId}`, { status, note }),
    onSuccess: async () => {
      await refresh();
      toast.success("Đã hoàn tất xử lý báo cáo");
    },
    onError: (error) => toast.error(getApiError(error)),
  });

  if (!isAdmin) return null;
  if (overview.isLoading) return <PageLoading />;
  if (overview.isError) return <ErrorState message="Trang quản trị chưa tải được. Bạn thử lại nhé." />;

  const tabs: Array<{ value: Tab; label: string; icon: typeof ShieldCheck }> = [
    { value: "overview", label: "Tổng quan", icon: BarChart3 },
    { value: "reports", label: "Báo cáo", icon: Flag },
    { value: "users", label: "Người dùng", icon: Users },
    { value: "content", label: "Nội dung", icon: FileText },
    { value: "graph", label: "Mạng lưới", icon: Network },
    { value: "audit", label: "Nhật ký", icon: History },
  ];

  return (
    <div className="min-h-screen border-x border-neutral-200 dark:border-neutral-800">
      <header className="sticky top-0 z-20 border-b border-neutral-200 bg-background/90 px-5 py-4 backdrop-blur dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5" />
          <h1 className="text-lg font-bold">Trung tâm quản trị</h1>
        </div>
        <p className="mt-1 text-sm text-neutral-500">Quản lý người dùng, kiểm duyệt nội dung và theo dõi hoạt động của Misonet.</p>
      </header>

      <nav className="flex gap-1 overflow-x-auto border-b border-neutral-200 p-2 dark:border-neutral-800">
        {tabs.map(({ value, label, icon: Icon }) => (
          <Button key={value} variant={tab === value ? "default" : "ghost"} size="sm" onClick={() => setTab(value)}>
            <Icon className="size-4" /> {label}
          </Button>
        ))}
      </nav>

      {tab === "overview" && overview.data ? <Overview data={overview.data} /> : null}
      {tab === "users" ? (
        <UsersPanel
          data={users.data}
          loading={users.isLoading}
          error={users.isError}
          currentPersonId={user.personId}
          searchInput={userSearchInput}
          setSearchInput={setUserSearchInput}
          status={userStatus}
          role={userRole}
          setStatus={(value) => { setUserStatus(value); setUserPage(1); }}
          setRole={(value) => { setUserRole(value); setUserPage(1); }}
          submit={(event) => { event.preventDefault(); setUserSearch(userSearchInput.trim()); setUserPage(1); }}
          page={userPage}
          setPage={setUserPage}
          changeStatus={(person, status) => {
            const note = status === "ACTIVE" ? "" : window.prompt("Cho biết lý do thay đổi trạng thái tài khoản")?.trim();
            if (status === "ACTIVE" || note) changeStatus.mutate({ personId: person.personId, status, note: note ?? "" });
          }}
          changeRole={(person, role) => {
            if (window.confirm(`${role === "ADMIN" ? "Cấp quyền quản trị cho" : "Gỡ quyền quản trị của"} @${person.username}?`)) changeRole.mutate({ personId: person.personId, role });
          }}
        />
      ) : null}
      {tab === "content" ? (
        <ContentPanel
          data={content.data}
          loading={content.isLoading}
          error={content.isError}
          type={contentType}
          status={contentStatus}
          searchInput={contentSearchInput}
          setSearchInput={setContentSearchInput}
          setType={(value) => { setContentType(value); setContentPage(1); }}
          setStatus={(value) => { setContentStatus(value); setContentPage(1); }}
          submit={(event) => { event.preventDefault(); setContentSearch(contentSearchInput.trim()); setContentPage(1); }}
          page={contentPage}
          setPage={setContentPage}
          moderate={(item, status) => {
            const reason = status === "VISIBLE" ? "" : window.prompt("Cho biết lý do ẩn hoặc gỡ nội dung này")?.trim();
            if (status === "VISIBLE" || reason) moderate.mutate({ item, status, reason: reason ?? "" });
          }}
        />
      ) : null}
      {tab === "reports" ? (
        <ReportsPanel
          data={reports.data}
          loading={reports.isLoading}
          error={reports.isError}
          status={reportStatus}
          currentPersonId={user.personId}
          setStatus={(value) => { setReportStatus(value); setReportPage(1); }}
          page={reportPage}
          setPage={setReportPage}
          assign={(reportId) => assignReport.mutate(reportId)}
          resolve={(report, status) => {
            const note = window.prompt(status === "RESOLVED" ? "Kết quả xử lý" : "Lý do bác bỏ")?.trim();
            if (note) resolveReport.mutate({ reportId: report.reportId, status, note });
          }}
        />
      ) : null}
      {tab === "graph" ? <GraphPanel data={graph.data} loading={graph.isLoading} error={graph.isError} /> : null}
      {tab === "audit" ? <AuditPanel data={audit.data} loading={audit.isLoading} error={audit.isError} page={auditPage} setPage={setAuditPage} /> : null}
    </div>
  );
}

function Overview({ data }: { data: AdminOverview }) {
  const metrics = [
    ["Người dùng", data.users, Users],
    ["Đang hoạt động", data.activeUsers, UserCheck],
    ["Tạm khóa", data.suspendedUsers, UserRoundX],
    ["Đã khóa", data.bannedUsers, ShieldCheck],
    ["Bài viết", data.posts, FileText],
    ["Đăng lại", data.reposts, Repeat2],
    ["Bình luận", data.comments, MessageSquare],
    ["Báo cáo", data.reports, Flag],
    ["Đang xử lý", data.openReports, AlertTriangle],
    ["Lượt theo dõi", data.follows, Activity],
    ["Bạn bè", data.friends, UsersRound],
    ["Lượt thích", data.likes, Heart],
  ] as const;
  return (
    <section className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
      {metrics.map(([label, value, Icon]) => (
        <Card key={label} className="p-4">
          <Icon className="size-4 text-neutral-500" />
          <div className="mt-3 text-2xl font-bold">{value}</div>
          <div className="text-xs text-neutral-500">{label}</div>
        </Card>
      ))}
    </section>
  );
}

function UsersPanel(props: {
  data?: Paginated<AdminUser>; loading: boolean; error: boolean; currentPersonId: string;
  searchInput: string; setSearchInput: (value: string) => void; status: string; role: string;
  setStatus: (value: string) => void; setRole: (value: string) => void;
  submit: (event: FormEvent) => void; page: number; setPage: (page: number) => void;
  changeStatus: (person: AdminUser, status: AccountStatus) => void;
  changeRole: (person: AdminUser, role: "USER" | "ADMIN") => void;
}) {
  return (
    <section>
      <form onSubmit={props.submit} className="grid gap-2 border-b border-neutral-200 p-4 dark:border-neutral-800 sm:grid-cols-[1fr_auto_auto_auto]">
        <input value={props.searchInput} onChange={(event) => props.setSearchInput(event.target.value)} placeholder="Tên, username hoặc email" className="h-10 rounded-full border border-neutral-300 bg-transparent px-4 text-sm outline-none dark:border-neutral-700" />
        <select value={props.status} onChange={(event) => props.setStatus(event.target.value)} className="h-10 rounded-full border bg-background px-3 text-sm"><option value="">Mọi trạng thái</option><option value="ACTIVE">Đang hoạt động</option><option value="SUSPENDED">Tạm ngưng</option><option value="BANNED">Đã khóa</option></select>
        <select value={props.role} onChange={(event) => props.setRole(event.target.value)} className="h-10 rounded-full border bg-background px-3 text-sm"><option value="">Mọi quyền</option><option value="USER">Thành viên</option><option value="ADMIN">Quản trị viên</option></select>
        <Button type="submit">Tìm</Button>
      </form>
      <PanelState loading={props.loading} error={props.error} message="Danh sách người dùng chưa tải được. Bạn thử lại nhé." />
      {props.data?.items.map((person) => (
        <article key={person.personId} className="border-b border-neutral-200 p-4 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <Avatar name={person.fullName} src={person.avatarUrl} />
            <div className="min-w-0 flex-1"><Link href={`/profile/${person.username}`} className="block truncate text-sm font-semibold hover:underline">{person.fullName}</Link><p className="truncate text-xs text-neutral-500">@{person.username} · {person.email}</p></div>
            <span className="rounded-full border px-2 py-1 text-[11px] font-semibold">{roleLabels[person.role]}</span>
            <span className="rounded-full border px-2 py-1 text-[11px] font-semibold">{accountStatusLabels[person.accountStatus]}</span>
          </div>
          {person.moderationReason ? <p className="mt-2 text-xs text-neutral-500">Lý do: {person.moderationReason}</p> : null}
          {person.personId !== props.currentPersonId ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {person.accountStatus !== "ACTIVE" ? <Button size="sm" variant="outline" onClick={() => props.changeStatus(person, "ACTIVE")}>Kích hoạt</Button> : null}
              {person.accountStatus !== "SUSPENDED" ? <Button size="sm" variant="outline" onClick={() => props.changeStatus(person, "SUSPENDED")}>Tạm khóa</Button> : null}
              {person.accountStatus !== "BANNED" ? <Button size="sm" variant="danger" onClick={() => props.changeStatus(person, "BANNED")}>Khóa tài khoản</Button> : null}
              <Button size="sm" variant="ghost" onClick={() => props.changeRole(person, person.role === "ADMIN" ? "USER" : "ADMIN")}>{person.role === "ADMIN" ? "Gỡ quyền quản trị" : "Cấp quyền quản trị"}</Button>
            </div>
          ) : null}
        </article>
      ))}
      <Pager page={props.page} total={props.data?.total ?? 0} setPage={props.setPage} />
    </section>
  );
}

function ContentPanel(props: {
  data?: Paginated<AdminContent>; loading: boolean; error: boolean;
  type: "POST" | "COMMENT"; status: string; searchInput: string;
  setSearchInput: (value: string) => void; setType: (value: "POST" | "COMMENT") => void;
  setStatus: (value: string) => void; submit: (event: FormEvent) => void;
  page: number; setPage: (page: number) => void;
  moderate: (item: AdminContent, status: ModerationStatus) => void;
}) {
  return (
    <section>
      <form onSubmit={props.submit} className="grid gap-2 border-b p-4 sm:grid-cols-[1fr_auto_auto_auto]">
        <input value={props.searchInput} onChange={(event) => props.setSearchInput(event.target.value)} placeholder="Tìm nội dung" className="h-10 rounded-full border bg-transparent px-4 text-sm outline-none" />
        <select value={props.type} onChange={(event) => props.setType(event.target.value as "POST" | "COMMENT")} className="h-10 rounded-full border bg-background px-3 text-sm"><option value="POST">Bài viết</option><option value="COMMENT">Bình luận</option></select>
        <select value={props.status} onChange={(event) => props.setStatus(event.target.value)} className="h-10 rounded-full border bg-background px-3 text-sm"><option value="">Mọi trạng thái</option><option value="VISIBLE">Đang hiển thị</option><option value="HIDDEN">Đang ẩn</option><option value="REMOVED">Đã gỡ</option></select>
        <Button type="submit">Tìm</Button>
      </form>
      <PanelState loading={props.loading} error={props.error} message="Danh sách nội dung chưa tải được. Bạn thử lại nhé." />
      {props.data?.items.map((item) => (
        <article key={item.contentId} className="border-b p-5">
          <div className="flex justify-between gap-3"><span className="text-xs font-semibold">{contentTypeLabels[item.type]} · {moderationStatusLabels[item.moderationStatus]}</span><time className="text-xs text-neutral-500">{formatDate(item.createdAt)}</time></div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{item.content || "Nội dung trống"}</p>
          <p className="mt-2 text-xs text-neutral-500">{item.author ? `@${item.author.username}` : "Không rõ tác giả"}{item.moderationReason ? ` · ${item.moderationReason}` : ""}</p>
          <div className="mt-3 flex gap-2">{item.moderationStatus !== "VISIBLE" ? <Button size="sm" variant="outline" onClick={() => props.moderate(item, "VISIBLE")}>Khôi phục</Button> : null}{item.moderationStatus !== "HIDDEN" ? <Button size="sm" variant="outline" onClick={() => props.moderate(item, "HIDDEN")}>Ẩn</Button> : null}{item.moderationStatus !== "REMOVED" ? <Button size="sm" variant="danger" onClick={() => props.moderate(item, "REMOVED")}>Gỡ</Button> : null}</div>
        </article>
      ))}
      <Pager page={props.page} total={props.data?.total ?? 0} setPage={props.setPage} />
    </section>
  );
}

function ReportsPanel(props: {
  data?: Paginated<AdminReport>; loading: boolean; error: boolean; status: string;
  currentPersonId: string;
  setStatus: (value: string) => void; page: number; setPage: (page: number) => void;
  assign: (reportId: string) => void;
  resolve: (report: AdminReport, status: "RESOLVED" | "REJECTED") => void;
}) {
  return (
    <section>
      <div className="border-b p-4"><select value={props.status} onChange={(event) => props.setStatus(event.target.value)} className="h-10 rounded-full border bg-background px-3 text-sm"><option value="">Mọi trạng thái</option><option value="PENDING">Chờ xử lý</option><option value="IN_REVIEW">Đang xem xét</option><option value="RESOLVED">Đã giải quyết</option><option value="REJECTED">Đã bác bỏ</option></select></div>
      <PanelState loading={props.loading} error={props.error} message="Danh sách báo cáo chưa tải được. Bạn thử lại nhé." />
      {props.data?.items.map((report) => (
        <article key={report.reportId} className="border-b p-5">
          <div className="flex flex-wrap items-center justify-between gap-2"><span className="rounded-full border px-2 py-1 text-xs font-semibold">{reportStatusLabels[report.status]}</span><time className="text-xs text-neutral-500">{formatDate(report.createdAt)}</time></div>
          <Link href={`/admin/reports/${report.reportId}`} className="mt-3 block text-sm font-semibold hover:underline">
            {report.targetPreview || "Không có nội dung xem trước"}
          </Link>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{reasonLabels[report.reason] ?? report.reason}{report.details ? ` · ${report.details}` : ""}</p>
          <p className="mt-2 text-xs text-neutral-500">Bởi @{report.reporter.username}{report.assignee ? ` · Phụ trách: @${report.assignee.username}` : " · Chưa phân công"}</p>
          {report.status === "PENDING" ? <div className="mt-3"><Button size="sm" onClick={() => props.assign(report.reportId)}>Nhận xử lý</Button></div> : null}
          {report.status === "IN_REVIEW" && report.assignee?.personId === props.currentPersonId ? <div className="mt-3 flex gap-2"><Button size="sm" onClick={() => props.resolve(report, "RESOLVED")}>Giải quyết</Button><Button size="sm" variant="outline" onClick={() => props.resolve(report, "REJECTED")}>Bác bỏ</Button></div> : null}
          {report.resolutionNote ? <p className="mt-3 rounded-xl bg-neutral-100 p-3 text-xs dark:bg-neutral-900">Kết luận: {report.resolutionNote}</p> : null}
          <Link href={`/admin/reports/${report.reportId}`} className="mt-3 inline-block text-xs font-semibold underline underline-offset-4">Xem nội dung bị báo cáo</Link>
        </article>
      ))}
      <Pager page={props.page} total={props.data?.total ?? 0} setPage={props.setPage} />
    </section>
  );
}

function GraphPanel({ data, loading, error }: { data?: AdminGraphOverview; loading: boolean; error: boolean }) {
  if (loading) return <PageLoading />;
  if (error || !data) return <ErrorState message="Chưa tải được số liệu mạng lưới. Bạn thử lại nhé." />;
  const groups: Array<[string, AdminRanking[]]> = [["Được theo dõi nhiều nhất", data.topFollowers], ["Có nhiều bạn bè nhất", data.topFriends], ["Nhận nhiều lượt thích nhất", data.topLiked], ["Bị báo cáo nhiều nhất", data.topReported]];
  return <section className="grid gap-4 p-4 sm:grid-cols-2">{groups.map(([title, items]) => <Card key={title} className="p-4"><h2 className="font-bold">{title}</h2><ol className="mt-4 space-y-3">{items.map((item, index) => <li key={item.personId} className="flex items-center gap-3 text-sm"><span className="w-5 text-neutral-400">{index + 1}</span><Link href={`/profile/${item.username}`} className="min-w-0 flex-1 truncate hover:underline">{item.fullName} <span className="text-neutral-500">@{item.username}</span></Link><strong>{item.score}</strong></li>)}</ol></Card>)}</section>;
}

function AuditPanel(props: { data?: Paginated<AdminAudit>; loading: boolean; error: boolean; page: number; setPage: (page: number) => void }) {
  return <section><PanelState loading={props.loading} error={props.error} message="Chưa tải được nhật ký quản trị. Bạn thử lại nhé." />{props.data?.items.map((item) => <article key={item.auditId} className="border-b p-5"><div className="flex justify-between gap-3"><strong className="text-sm">{auditActionLabels[item.action] ?? item.action}</strong><time className="text-xs text-neutral-500">{formatDate(item.createdAt)}</time></div><p className="mt-1 text-xs text-neutral-500">Thực hiện bởi @{item.actor.username} · {contentTypeLabels[item.targetType] ?? item.targetType} #{item.targetId}</p>{item.note ? <p className="mt-2 text-sm">Lý do: {item.note}</p> : null}{item.beforeJson || item.afterJson ? <details className="mt-3 text-xs"><summary className="cursor-pointer font-semibold">Xem thay đổi trước và sau</summary><pre className="mt-2 overflow-auto rounded-xl bg-neutral-100 p-3 dark:bg-neutral-900">{item.beforeJson || "{}"}{"\n→\n"}{item.afterJson || "{}"}</pre></details> : null}</article>)}<Pager page={props.page} total={props.data?.total ?? 0} setPage={props.setPage} /></section>;
}

function PanelState({ loading, error, message }: { loading: boolean; error: boolean; message: string }) {
  if (loading) return <PageLoading />;
  if (error) return <ErrorState message={message} />;
  return null;
}

function Pager({ page, total, setPage }: { page: number; total: number; setPage: (page: number) => void }) {
  if (total <= pageSize) return null;
  const pages = Math.ceil(total / pageSize);
  return <div className="flex items-center justify-between p-4 text-sm"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Trang trước</Button><span>{page}/{pages} · {total} mục</span><Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage(page + 1)}>Trang sau</Button></div>;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("vi-VN");
}
