"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, LockKeyhole, Pencil, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../auth/auth-provider";
import { Avatar } from "../ui/avatar";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { api, getApiError } from "@/lib/api";
import type { Profile, UploadedMedia } from "@/lib/types";

const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function EditProfileDialog({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState(profile.fullName);
  const [bio, setBio] = useState(profile.bio);
  const [isPrivate, setIsPrivate] = useState(profile.isPrivate);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { refreshUser } = useAuth();

  useEffect(
    () => () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    },
    [avatarPreview],
  );

  const mutation = useMutation({
    mutationFn: async () => {
      let avatarUrl: string | undefined;

      if (avatarFile) {
        const formData = new FormData();
        formData.append("file", avatarFile);
        const uploaded = (
          await api.post<UploadedMedia>("/uploads/profile-avatar", formData)
        ).data;
        avatarUrl = uploaded.secureUrl;
      }

      return api.patch("/users/me", {
        fullName,
        bio,
        isPrivate,
        ...(avatarUrl ? { avatarUrl } : {}),
      });
    },
    onSuccess: async () => {
      await refreshUser();
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      setOpen(false);
      clearAvatarSelection();
      toast.success("Hồ sơ đã được cập nhật");
    },
    onError: (error) => toast.error(getApiError(error)),
  });

  function selectAvatar(file: File | undefined) {
    if (!file) return;
    if (!AVATAR_TYPES.includes(file.type)) {
      toast.error("Ảnh đại diện phải là JPG, PNG hoặc WebP");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Ảnh đại diện không được vượt quá 10 MB");
      return;
    }

    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  function clearAvatarSelection() {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(null);
    setAvatarPreview(null);
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  }

  function changeOpen(value: boolean) {
    setOpen(value);
    if (!value && !mutation.isPending) clearAvatarSelection();
  }

  return (
    <Dialog.Root open={open} onOpenChange={changeOpen}>
      <Dialog.Trigger asChild>
        <Button variant="outline">
          <Pencil className="size-4" /> Chỉnh sửa hồ sơ
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl outline-none dark:bg-slate-900">
          <div className="flex items-start justify-between">
            <div>
              <Dialog.Title className="text-xl font-extrabold">
                Chỉnh sửa hồ sơ
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-slate-500">
                Cập nhật cách mọi người nhìn thấy bạn trên Misonet.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon">
                <X className="size-4" />
              </Button>
            </Dialog.Close>
          </div>

          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
              <Avatar
                name={fullName || profile.fullName}
                src={avatarPreview ?? profile.avatarUrl}
                className="size-20"
              />
              <div className="min-w-0 flex-1">
                <input
                  ref={avatarInputRef}
                  type="file"
                  className="hidden"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  onChange={(event) => selectAvatar(event.target.files?.[0])}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={mutation.isPending}
                  onClick={() => avatarInputRef.current?.click()}
                >
                  <Camera className="size-4" /> Chọn ảnh từ máy
                </Button>
                <p className="mt-2 truncate text-xs text-slate-500">
                  {avatarFile
                    ? `${avatarFile.name} · ${(avatarFile.size / 1024 / 1024).toFixed(1)} MB`
                    : "JPG, PNG hoặc WebP · tối đa 10 MB"}
                </p>
              </div>
            </div>

            <label className="block space-y-1.5 text-sm font-semibold">
              Họ và tên
              <Input
                value={fullName}
                maxLength={100}
                onChange={(event) => setFullName(event.target.value)}
              />
            </label>
            <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
              <span className="flex gap-3">
                <LockKeyhole className="mt-0.5 size-5 shrink-0" />
                <span>
                  <span className="block text-sm font-semibold">
                    Trang cá nhân riêng tư
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    Người khác không thể xem danh sách bạn bè, follower và
                    following của bạn.
                  </span>
                </span>
              </span>
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(event) => setIsPrivate(event.target.checked)}
                className="mt-1 size-5 accent-black dark:accent-white"
              />
            </label>
            <label className="block space-y-1.5 text-sm font-semibold">
              Giới thiệu
              <textarea
                value={bio}
                maxLength={500}
                rows={4}
                onChange={(event) => setBio(event.target.value)}
                className="w-full resize-none rounded-xl border border-neutral-300 bg-transparent p-3 text-sm outline-none focus:border-black dark:border-neutral-700 dark:focus:border-white"
              />
            </label>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Dialog.Close asChild>
              <Button variant="ghost" disabled={mutation.isPending}>
                Hủy
              </Button>
            </Dialog.Close>
            <Button
              disabled={mutation.isPending || fullName.trim().length < 2}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending
                ? avatarFile
                  ? "Đang tải ảnh..."
                  : "Đang lưu..."
                : "Lưu thay đổi"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
