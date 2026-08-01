"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Network } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getApiError } from "@/lib/api";

const schema = z.object({
  fullName: z.string().trim().min(2, "Tên cần ít nhất 2 ký tự").max(100),
  username: z
    .string()
    .trim()
    .min(3, "Username cần ít nhất 3 ký tự")
    .max(30)
    .regex(/^[a-zA-Z0-9._]+$/, "Chỉ dùng chữ, số, dấu chấm và gạch dưới"),
  email: z.email("Email chưa hợp lệ"),
  password: z.string().min(8, "Mật khẩu cần ít nhất 8 ký tự").max(128),
});

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const { register: createAccount } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function submit(values: FormValues) {
    try {
      await createAccount(values);
      toast.success("Tài khoản đã sẵn sàng!");
    } catch (error) {
      toast.error(getApiError(error));
    }
  }

  return (
    <div>
      <div className="mb-8 flex items-center gap-2 font-extrabold lg:hidden">
        <Network className="size-6" /> Misonet
      </div>
      <p className="text-sm font-bold uppercase tracking-[.2em] text-neutral-500">
        Bắt đầu
      </p>
      <h2 className="mt-2 text-3xl font-extrabold tracking-tight">Tạo không gian của bạn</h2>
      <p className="mt-2 text-sm text-slate-500">Một phút để tham gia mạng lưới.</p>

      <form className="mt-7 grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit(submit)}>
        <Field label="Họ và tên" error={errors.fullName?.message} className="sm:col-span-2">
          <Input placeholder="Nguyễn Văn An" {...register("fullName")} />
        </Field>
        <Field label="Username" error={errors.username?.message}>
          <Input autoComplete="username" placeholder="an.nguyen" {...register("username")} />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <Input type="email" autoComplete="email" placeholder="an@example.com" {...register("email")} />
        </Field>
        <Field label="Mật khẩu" error={errors.password?.message} className="sm:col-span-2">
          <Input type="password" autoComplete="new-password" placeholder="Tối thiểu 8 ký tự" {...register("password")} />
        </Field>
        <Button className="mt-1 h-12 sm:col-span-2" disabled={isSubmitting}>
          {isSubmitting ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
          {!isSubmitting && <ArrowRight className="size-4" />}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Đã có tài khoản?{" "}
        <Link className="font-bold underline" href="/login">
          Đăng nhập
        </Link>
      </p>
    </div>
  );
}

function Field({
  label,
  error,
  children,
  className = "",
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block space-y-1.5 text-sm font-semibold ${className}`}>
      <span>{label}</span>
      {children}
      {error ? <span className="block text-xs font-medium text-rose-600">{error}</span> : null}
    </label>
  );
}
