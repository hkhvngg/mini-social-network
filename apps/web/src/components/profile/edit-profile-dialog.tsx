"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, LockKeyhole, Pencil, Plus, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../auth/auth-provider";
import { Avatar } from "../ui/avatar";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { api, getApiError } from "@/lib/api";
import type { Profile, ProfileField, UploadedMedia } from "@/lib/types";

const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_PROFILE_FIELDS = 10;

type EditableProfileField = Pick<
  ProfileField,
  "label" | "value" | "visibility"
>;

export function EditProfileDialog({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState(profile.fullName);
  const [bio, setBio] = useState(profile.bio);
  const [isPrivate, setIsPrivate] = useState(profile.isPrivate);
  const [profileFields, setProfileFields] = useState<EditableProfileField[]>(
    profile.profileFields.map(({ label, value, visibility }) => ({
      label,
      value,
      visibility,
    })),
  );
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
        profileFields: profileFields.map((field) => ({
          label: field.label.trim(),
          value: field.value.trim(),
          visibility: field.visibility,
        })),
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
    if (value) {
      setFullName(profile.fullName);
      setBio(profile.bio);
      setIsPrivate(profile.isPrivate);
      setProfileFields(
        profile.profileFields.map(({ label, value, visibility }) => ({
          label,
          value,
          visibility,
        })),
      );
    }
    setOpen(value);
    if (!value && !mutation.isPending) clearAvatarSelection();
  }

  function addProfileField() {
    if (profileFields.length >= MAX_PROFILE_FIELDS) return;
    setProfileFields((fields) => [
      ...fields,
      { label: "", value: "", visibility: "PUBLIC" },
    ]);
  }

  function updateProfileField(
    index: number,
    patch: Partial<EditableProfileField>,
  ) {
    setProfileFields((fields) =>
      fields.map((field, fieldIndex) =>
        fieldIndex === index ? { ...field, ...patch } : field,
      ),
    );
  }

  function removeProfileField(index: number) {
    setProfileFields((fields) =>
      fields.filter((_, fieldIndex) => fieldIndex !== index),
    );
  }

  const hasInvalidProfileField = profileFields.some(
    (field) => field.label.trim().length < 2 || !field.value.trim(),
  );

  return (
    <Dialog.Root open={open} onOpenChange={changeOpen}>
      <Dialog.Trigger asChild>
        <Button variant="outline">
          <Pencil className="size-4" /> Chỉnh sửa hồ sơ
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl outline-none dark:bg-slate-900">
          <div className="flex items-start justify-between">
            <div>
              <Dialog.Title className="text-xl font-extrabold">
                Chỉnh sửa hồ sơ
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-slate-500">
                Chỉnh sửa tên, ảnh đại diện và những điều bạn muốn chia sẻ về mình.
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
                    Người khác không thể xem danh sách bạn bè, người theo dõi
                    và những người bạn đang theo dõi.
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

            <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold">Thông tin bổ sung</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Thêm tối đa {MAX_PROFILE_FIELDS} thuộc tính như học vấn,
                    nghề nghiệp hoặc tình trạng hôn nhân. Nội dung không phù
                    hợp sẽ bị từ chối.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={
                    mutation.isPending ||
                    profileFields.length >= MAX_PROFILE_FIELDS
                  }
                  onClick={addProfileField}
                >
                  <Plus className="size-3.5" /> Thêm
                </Button>
              </div>

              <div className="mt-4 space-y-3">
                {profileFields.map((field, index) => (
                  <div
                    key={index}
                    className="grid gap-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)_7rem_auto]"
                  >
                    <Input
                      aria-label={`Tên thuộc tính ${index + 1}`}
                      placeholder="Học vấn"
                      value={field.label}
                      maxLength={50}
                      onChange={(event) =>
                        updateProfileField(index, {
                          label: event.target.value,
                        })
                      }
                    />
                    <Input
                      aria-label={`Giá trị thuộc tính ${index + 1}`}
                      placeholder="Đại học Bách Khoa"
                      value={field.value}
                      maxLength={300}
                      onChange={(event) =>
                        updateProfileField(index, {
                          value: event.target.value,
                        })
                      }
                    />
                    <select
                      aria-label={`Quyền xem thuộc tính ${index + 1}`}
                      value={field.visibility}
                      onChange={(event) =>
                        updateProfileField(index, {
                          visibility: event.target.value as
                            | "PUBLIC"
                            | "PRIVATE",
                        })
                      }
                      className="h-11 rounded-xl border border-neutral-300 bg-transparent px-2 text-xs outline-none dark:border-neutral-700"
                    >
                      <option value="PUBLIC">Công khai</option>
                      <option value="PRIVATE">Riêng tư</option>
                    </select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Xóa thuộc tính ${index + 1}`}
                      disabled={mutation.isPending}
                      onClick={() => removeProfileField(index)}
                    >
                      <Trash2 className="size-4 text-rose-600" />
                    </Button>
                  </div>
                ))}
                {!profileFields.length ? (
                  <p className="py-2 text-center text-xs text-slate-500">
                    Chưa có thông tin bổ sung.
                  </p>
                ) : null}
              </div>
            </section>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Dialog.Close asChild>
              <Button variant="ghost" disabled={mutation.isPending}>
                Hủy
              </Button>
            </Dialog.Close>
            <Button
              disabled={
                mutation.isPending ||
                fullName.trim().length < 2 ||
                hasInvalidProfileField
              }
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
