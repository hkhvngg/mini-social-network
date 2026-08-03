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
import { PasswordInput } from "@/components/ui/password-input";
import { getApiError } from "@/lib/api";

const schema = z.object({
  identifier: z.string().trim().min(1, "Bạn chưa nhập email hoặc tên người dùng."),
  password: z
    .string()
    .min(1, "Bạn chưa nhập mật khẩu.")
    .regex(
      /^[\x21-\x7E]+$/,
      "Mật khẩu chỉ dùng chữ không dấu, số và ký tự trên bàn phím tiếng Anh.",
    ),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const { login } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
  });

  async function submit(values: FormValues) {
    try {
      await login(values.identifier, values.password);
      toast.success("Chào mừng bạn trở lại!");
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
        Đăng nhập
      </p>
      <h2 className="mt-2 text-3xl font-extrabold tracking-tight">
        Mừng bạn quay lại
      </h2>
      <p className="mt-2 text-sm text-slate-500">
        Đăng nhập để xem hôm nay mọi người đang kể gì nhé.
      </p>

      <form className="mt-8 space-y-5" noValidate onSubmit={handleSubmit(submit)}>
        <Field label="Tên người dùng hoặc email" error={errors.identifier?.message}>
          <Input aria-invalid={Boolean(errors.identifier)} autoComplete="username" placeholder="an.nguyen" {...register("identifier")} />
        </Field>
        <Field label="Mật khẩu" error={errors.password?.message}>
          <PasswordInput aria-invalid={Boolean(errors.password)} autoComplete="current-password" placeholder="••••••••" {...register("password")} />
          <span className="block text-xs font-normal text-neutral-500">
            Dùng bàn phím tiếng Anh, không nhập chữ có dấu hoặc khoảng trắng.
          </span>
        </Field>
        <Button className="h-12 w-full" disabled={isSubmitting}>
          {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
          {!isSubmitting && <ArrowRight className="size-4" />}
        </Button>
      </form>

      <p className="mt-7 text-center text-sm text-slate-500">
        Chưa có tài khoản?{" "}
        <Link className="font-bold underline" href="/register">
          Tạo tài khoản
        </Link>
      </p>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2 text-sm font-semibold">
      <span>{label}</span>
      {children}
      {error ? <span role="alert" className="block text-xs font-medium text-rose-600">{error}</span> : null}
    </label>
  );
}
