import { AlertCircle, Inbox } from "lucide-react";

export function PageLoading() {
  return (
    <div className="space-y-4" aria-label="Đang tải">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="h-40 animate-pulse rounded-2xl bg-slate-200/70 dark:bg-slate-800"
        />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
      <Inbox className="mb-3 size-9 text-slate-400" />
      <h3 className="font-bold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
    </div>
  );
}

export function ErrorState({
  message = "Không thể tải dữ liệu.",
}: {
  message?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200">
      <AlertCircle className="size-5" />
      {message}
    </div>
  );
}
