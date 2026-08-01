import { Sparkles } from "lucide-react";
import Link from "next/link";
import { MisonetLogo } from "@/components/brand/misonet-logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden overflow-hidden bg-black p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Link href="/" className="relative flex items-center gap-3 text-xl font-extrabold">
          <MisonetLogo className="size-10" />
          Misonet
        </Link>
        <div className="relative max-w-xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-neutral-300">
            <Sparkles className="size-3.5" /> Kết nối theo cách có ý nghĩa
          </div>
          <h1 className="text-5xl font-extrabold leading-tight tracking-tight">
            Mỗi kết nối mở ra một câu chuyện mới.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">
            Chia sẻ khoảnh khắc, tìm lại bạn bè và khám phá những người bạn có thể
            quen qua mạng lưới chung.
          </p>
        </div>
        <p className="relative text-xs text-slate-500">
          Powered by Neo4j graph relationships
        </p>
      </section>
      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">{children}</div>
      </section>
    </main>
  );
}
