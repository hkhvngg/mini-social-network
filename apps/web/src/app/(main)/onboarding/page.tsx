"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, MapPin, Plus, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api, getApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

const SUGGESTED_INTERESTS = [
  "Công nghệ",
  "Âm nhạc",
  "Điện ảnh",
  "Nhiếp ảnh",
  "Thể thao",
  "Du lịch",
  "Đọc sách",
  "Ẩm thực",
  "Thiết kế",
  "Kinh doanh",
  "Game",
  "Tình nguyện",
] as const;

const SUGGESTED_LOCATIONS = [
  "TP. Hồ Chí Minh",
  "Hà Nội",
  "Đà Nẵng",
  "Cần Thơ",
  "Hải Phòng",
  "Huế",
  "Đà Lạt",
  "Nha Trang",
  "Vũng Tàu",
  "Biên Hòa",
] as const;

export default function OnboardingPage() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [interests, setInterests] = useState<string[]>(user?.interests ?? []);
  const [location, setLocation] = useState(user?.location ?? "");
  const [locationChoice, setLocationChoice] = useState(
    user?.location
      ? SUGGESTED_LOCATIONS.includes(
          user.location as (typeof SUGGESTED_LOCATIONS)[number],
        )
        ? user.location
        : "OTHER"
      : "",
  );
  const [customInterest, setCustomInterest] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function toggleInterest(interest: string) {
    const matching = interests.find(
      (item) => item.toLocaleLowerCase("vi") === interest.toLocaleLowerCase("vi"),
    );
    setInterests(
      matching ? interests.filter((item) => item !== matching) : [...interests, interest],
    );
  }

  function addCustomInterest() {
    const interest = customInterest.trim();
    if (interest.length < 2) {
      toast.error("Sở thích cần có ít nhất 2 ký tự.");
      return;
    }
    if (interest.length > 40) {
      toast.error("Mỗi sở thích chỉ nên dài tối đa 40 ký tự.");
      return;
    }
    if (interests.length >= 10) {
      toast.error("Bạn có thể chọn tối đa 10 sở thích.");
      return;
    }
    if (!interests.some((item) => item.toLocaleLowerCase("vi") === interest.toLocaleLowerCase("vi"))) {
      setInterests([...interests, interest]);
    }
    setCustomInterest("");
  }

  async function finishOnboarding() {
    if (location.trim().length < 2) {
      toast.error("Hãy chọn hoặc nhập nơi bạn đang sinh sống.");
      return;
    }
    if (!interests.length) {
      toast.error("Hãy chọn ít nhất một sở thích.");
      return;
    }

    setIsSaving(true);
    try {
      await api.patch("/users/me", { interests, location: location.trim() });
      await refreshUser();
      await queryClient.invalidateQueries({ queryKey: ["recommendations"] });
      toast.success("Misonet đã tìm thấy những người có thể hợp với bạn.");
      router.replace("/suggestions");
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="min-h-screen border-x border-neutral-200 px-4 py-8 dark:border-neutral-800 sm:px-8">
      <div className="mx-auto max-w-xl">
        <div className="flex size-12 items-center justify-center rounded-full bg-black text-white dark:bg-white dark:text-black">
          <Sparkles className="size-5" />
        </div>
        <p className="mt-5 text-xs font-bold uppercase tracking-[.2em] text-neutral-500">
          Hoàn thiện hồ sơ · Bước cuối
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Kể Misonet nghe một chút về bạn</h1>
        <p className="mt-3 text-sm leading-6 text-neutral-500">
          Bạn đang ở đâu, thích điều gì? Chừng đó là đủ để bắt đầu tìm những người hợp chuyện.
        </p>

        <Card className="mt-7 space-y-7 p-5 sm:p-6">
          <div>
            <label htmlFor="onboarding-location" className="text-sm font-semibold">Nơi đang sinh sống</label>
            <p className="mt-1 text-xs text-neutral-500">Chọn một địa điểm gợi ý hoặc nhập địa điểm khác.</p>
            <div className="relative mt-3">
              <MapPin className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-neutral-400" />
              <select
                id="onboarding-location"
                value={locationChoice}
                className="flex h-11 w-full appearance-none rounded-xl border border-neutral-300 bg-transparent pl-10 pr-4 text-sm outline-none focus:border-black dark:border-neutral-700 dark:focus:border-white"
                onChange={(event) => {
                  const value = event.target.value;
                  setLocationChoice(value);
                  setLocation(value === "OTHER" ? "" : value);
                }}
              >
                <option value="" disabled>Chọn nơi đang sinh sống</option>
                {SUGGESTED_LOCATIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                <option value="OTHER">Địa điểm khác...</option>
              </select>
            </div>
            {locationChoice === "OTHER" ? (
              <Input
                value={location}
                maxLength={100}
                className="mt-3"
                autoFocus
                placeholder="Nhập tỉnh hoặc thành phố của bạn"
                onChange={(event) => setLocation(event.target.value)}
              />
            ) : null}
          </div>

          <fieldset>
            <legend className="text-sm font-semibold">Chọn sở thích</legend>
            <p className="mt-1 text-xs text-neutral-500">Chọn từ 1 đến 10 mục hoặc thêm sở thích riêng.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {SUGGESTED_INTERESTS.map((interest) => {
                const selected = interests.includes(interest);
                return (
                  <button
                    key={interest}
                    type="button"
                    aria-pressed={selected}
                    className={cn(
                      "rounded-full border px-3 py-2 text-xs font-semibold transition",
                      selected
                        ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                        : "border-neutral-300 hover:border-black dark:border-neutral-700 dark:hover:border-white",
                    )}
                    onClick={() => toggleInterest(interest)}
                  >
                    {interest}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex gap-2">
              <Input
                value={customInterest}
                maxLength={40}
                placeholder="Sở thích khác của bạn"
                onChange={(event) => setCustomInterest(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addCustomInterest();
                  }
                }}
              />
              <Button type="button" variant="secondary" className="shrink-0 px-4" onClick={addCustomInterest}>
                <Plus className="size-4" /> Thêm
              </Button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {interests
                .filter((interest) => !SUGGESTED_INTERESTS.includes(interest as (typeof SUGGESTED_INTERESTS)[number]))
                .map((interest) => (
                  <button
                    key={interest}
                    type="button"
                    className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-1.5 text-xs dark:bg-neutral-900"
                    onClick={() => toggleInterest(interest)}
                  >
                    {interest} <X className="size-3" />
                  </button>
                ))}
            </div>
          </fieldset>

          <Button className="h-12 w-full" disabled={isSaving} onClick={finishOnboarding}>
            {isSaving ? "Đang tìm người phù hợp..." : "Xem những người phù hợp với bạn"}
            {!isSaving ? <ArrowRight className="size-4" /> : null}
          </Button>
        </Card>
      </div>
    </section>
  );
}
