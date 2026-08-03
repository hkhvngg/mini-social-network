"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, MapPin, Network } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { getApiError } from "@/lib/api";

const passwordSchema = z
  .string()
  .min(1, "Bạn chưa tạo mật khẩu.")
  .min(8, "Mật khẩu cần có ít nhất 8 ký tự.")
  .max(128, "Mật khẩu dài hơn mức cho phép.")
  .regex(
    /^[\x21-\x7E]+$/,
    "Mật khẩu chỉ dùng chữ không dấu, số và ký tự trên bàn phím tiếng Anh.",
  );

const schema = z
  .object({
    fullName: z.string().trim().min(1, "Bạn cho mình biết tên nhé.").min(2, "Tên cần có ít nhất 2 ký tự.").max(100, "Tên dài hơn mức cho phép."),
    username: z
      .string()
      .trim()
      .min(1, "Bạn chưa chọn tên người dùng.")
      .min(3, "Tên người dùng cần có ít nhất 3 ký tự.")
      .max(30, "Tên người dùng chỉ nên dài tối đa 30 ký tự.")
      .regex(/^[a-zA-Z0-9._]+$/, "Chỉ dùng chữ, số, dấu chấm và gạch dưới nhé."),
    email: z.string().trim().min(1, "Bạn chưa nhập email.").pipe(z.email("Email chưa đúng định dạng. Ví dụ: ban@example.com.")),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Bạn chưa nhập lại mật khẩu."),
    location: z.string().trim().min(1, "Bạn chưa nhập nơi đang sống.").min(2, "Tên địa điểm cần có ít nhất 2 ký tự.").max(100, "Tên địa điểm dài hơn mức cho phép."),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Mật khẩu nhập lại chưa khớp.",
  });

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const { register: createAccount } = useAuth();
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
      await createAccount({
        username: values.username,
        email: values.email,
        password: values.password,
        fullName: values.fullName,
        location: values.location,
      });
      toast.success("Tài khoản đã được tạo. Hãy hoàn thiện sở thích của bạn!");
    } catch (error) {
      toast.error(getApiError(error));
    }
  }

  return (
    <div>
      <div className="mb-8 flex items-center gap-2 font-extrabold lg:hidden">
        <Network className="size-6" /> Misonet
      </div>
      <p className="text-sm font-bold uppercase tracking-[.2em] text-neutral-500">Bắt đầu</p>
      <h2 className="mt-2 text-3xl font-extrabold tracking-tight">Mình làm quen nhé</h2>
      <p className="mt-2 text-sm text-slate-500">
        Chia sẻ đôi chút về bạn để Misonet tìm đúng người, đúng câu chuyện.
      </p>

      <form className="mt-7 grid gap-4 sm:grid-cols-2" noValidate onSubmit={handleSubmit(submit)}>
        <Field label="Họ và tên" error={errors.fullName?.message} className="sm:col-span-2">
          <Input aria-invalid={Boolean(errors.fullName)} placeholder="Nguyễn Văn An" {...register("fullName")} />
        </Field>
        <Field label="Tên người dùng" error={errors.username?.message}>
          <Input aria-invalid={Boolean(errors.username)} autoComplete="username" placeholder="an.nguyen" {...register("username")} />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <Input aria-invalid={Boolean(errors.email)} type="email" autoComplete="email" placeholder="an@example.com" {...register("email")} />
        </Field>
        <Field label="Mật khẩu" error={errors.password?.message}>
          <PasswordInput aria-invalid={Boolean(errors.password)} autoComplete="new-password" placeholder="Tối thiểu 8 ký tự" {...register("password")} />
          <span className="block text-xs font-normal text-neutral-500">
            Dùng bàn phím tiếng Anh, không nhập chữ có dấu hoặc khoảng trắng.
          </span>
        </Field>
        <Field label="Nhập lại mật khẩu" error={errors.confirmPassword?.message}>
          <PasswordInput aria-invalid={Boolean(errors.confirmPassword)} autoComplete="new-password" placeholder="Nhập lại mật khẩu" {...register("confirmPassword")} />
        </Field>
        <Field label="Nơi đang sinh sống" error={errors.location?.message} className="sm:col-span-2">
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-neutral-400" />
            <Input aria-invalid={Boolean(errors.location)} className="pl-10" placeholder="TP. Hồ Chí Minh" {...register("location")} />
          </div>
        </Field>
        <Button className="mt-1 h-12 sm:col-span-2" disabled={isSubmitting}>
          {isSubmitting ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
          {!isSubmitting && <ArrowRight className="size-4" />}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Đã có tài khoản?{" "}
        <Link className="font-bold underline" href="/login">Đăng nhập</Link>
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
      {error ? <span role="alert" className="block text-xs font-medium text-rose-600">{error}</span> : null}
    </label>
  );
}
