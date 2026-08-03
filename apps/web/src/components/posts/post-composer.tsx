"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../auth/auth-provider";
import { Avatar } from "../ui/avatar";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { api, getApiError } from "@/lib/api";
import type { UploadedMedia } from "@/lib/types";

const ACCEPTED_MEDIA = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
  "video/quicktime",
];

export function PostComposer() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [privacy, setPrivacy] = useState("PUBLIC");

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  const mutation = useMutation({
    mutationFn: async () => {
      let media: UploadedMedia | undefined;

      if (mediaFile) {
        const formData = new FormData();
        formData.append("file", mediaFile);
        media = (
          await api.post<UploadedMedia>("/uploads/post-media", formData)
        ).data;
      }

      return api.post("/posts", {
        content,
        privacy,
        ...(media ? { media } : {}),
      });
    },
    onSuccess: async () => {
      setContent("");
      clearMedia();
      await queryClient.invalidateQueries({ queryKey: ["posts"] });
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Bài viết đã được chia sẻ");
    },
    onError: (error) => toast.error(getApiError(error)),
  });

  function selectMedia(file: File | undefined) {
    if (!file) return;
    if (!ACCEPTED_MEDIA.includes(file.type)) {
      toast.error("Chỉ hỗ trợ JPG, PNG, WebP, MP4, WebM hoặc MOV");
      return;
    }

    const maxBytes = file.type.startsWith("image/")
      ? 10 * 1024 * 1024
      : 50 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error(
        file.type.startsWith("image/")
          ? "Ảnh không được vượt quá 10 MB"
          : "Video không được vượt quá 50 MB",
      );
      return;
    }

    setMediaFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function clearMedia() {
    setMediaFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  if (!user) return null;

  return (
    <Card className="rounded-none border-0 p-4 sm:p-5">
      <div className="flex gap-3">
        <Avatar name={user.fullName} src={user.avatarUrl} />
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          maxLength={5000}
          rows={3}
          placeholder={`Bạn đang nghĩ gì, ${user.fullName.split(" ").at(-1)}?`}
          className="min-h-24 flex-1 resize-none bg-transparent py-2 text-[15px] leading-6 outline-none placeholder:text-slate-400"
        />
      </div>

      {previewUrl && mediaFile ? (
        <div className="relative mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 dark:border-slate-700">
          {mediaFile.type.startsWith("image/") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Xem trước ảnh sẽ đăng"
              className="max-h-96 w-full object-contain"
            />
          ) : (
            <video
              src={previewUrl}
              controls
              preload="metadata"
              className="max-h-96 w-full"
            />
          )}
          <Button
            variant="secondary"
            size="icon"
            className="absolute right-2 top-2"
            aria-label="Bỏ ảnh hoặc video đã chọn"
            onClick={clearMedia}
          >
            <X className="size-4" />
          </Button>
          <p className="truncate bg-white px-3 py-2 text-xs text-slate-500 dark:bg-slate-900">
            {mediaFile.name} · {(mediaFile.size / 1024 / 1024).toFixed(1)} MB
          </p>
        </div>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".jpg,.jpeg,.png,.webp,.mp4,.webm,.mov,image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
        onChange={(event) => selectMedia(event.target.files?.[0])}
      />

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={mutation.isPending}
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus className="size-4" /> Ảnh/video
          </Button>
          <select
            value={privacy}
            onChange={(event) => setPrivacy(event.target.value)}
            className="h-8 rounded-lg bg-slate-100 px-2 text-xs font-semibold outline-none dark:bg-slate-800"
            aria-label="Quyền riêng tư"
          >
            <option value="PUBLIC">Công khai</option>
            <option value="FRIENDS">Bạn bè</option>
            <option value="PRIVATE">Chỉ mình tôi</option>
          </select>
        </div>
        <Button
          size="sm"
          disabled={!content.trim() || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          <Send className="size-3.5" />
          {mutation.isPending
            ? mediaFile
              ? "Đang tải lên..."
              : "Đang đăng..."
            : "Đăng"}
        </Button>
      </div>
    </Card>
  );
}
