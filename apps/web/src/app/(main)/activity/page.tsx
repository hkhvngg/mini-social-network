import { Bell } from "lucide-react";
import { EmptyState } from "@/components/ui/states";

export default function ActivityPage() {
  return (
    <section className="min-h-[70vh] border-x border-neutral-200 dark:border-neutral-800">
      <header className="border-b border-neutral-200 px-4 py-5 dark:border-neutral-800 sm:px-6">
        <h1 className="text-xl font-bold">Hoạt động</h1>
      </header>
      <div className="px-4 py-16 sm:px-6">
        <div className="mx-auto mb-5 grid size-14 place-items-center rounded-full border border-neutral-200 dark:border-neutral-800">
          <Bell className="size-6" />
        </div>
        <EmptyState
          title="Chưa có hoạt động mới"
          description="Thông báo follow, bạn bè và lượt thích sẽ xuất hiện tại đây khi backend notification được bổ sung."
        />
      </div>
    </section>
  );
}
