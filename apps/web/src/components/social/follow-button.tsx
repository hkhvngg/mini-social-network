"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UserCheck, UserPlus, UserRoundMinus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { api, getApiError } from "@/lib/api";

export function FollowButton({
  personId,
  isFollowing,
  relationship,
  compact = false,
}: {
  personId: string;
  isFollowing: boolean;
  relationship?: {
    isFollowing: boolean;
    isFollowedBy: boolean;
    isFriend: boolean;
  };
  compact?: boolean;
}) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () =>
      api.request({
        url: `/users/${personId}/follow`,
        method: (relationship?.isFollowing ?? isFollowing) ? "DELETE" : "POST",
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["profile"] }),
        queryClient.invalidateQueries({ queryKey: ["connections"] }),
        queryClient.invalidateQueries({ queryKey: ["recommendations"] }),
        queryClient.invalidateQueries({ queryKey: ["search"] }),
      ]);
      toast.success(
        (relationship?.isFollowing ?? isFollowing)
          ? "Đã bỏ theo dõi"
          : "Đã theo dõi",
      );
    },
    onError: (error) => toast.error(getApiError(error)),
  });
  const following = relationship?.isFollowing ?? isFollowing;
  const label = relationship?.isFriend
    ? "Bạn bè"
    : following
      ? "Đang theo dõi"
      : relationship?.isFollowedBy
        ? "Theo dõi lại"
        : "Theo dõi";
  const Icon = relationship?.isFriend
    ? UserCheck
    : following
      ? UserRoundMinus
      : UserPlus;

  return (
    <Button
      size={compact ? "sm" : "default"}
      variant={following ? "outline" : "default"}
      disabled={mutation.isPending}
      onClick={() => mutation.mutate()}
    >
      {mutation.isPending ? (
        <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        <Icon className="size-4" />
      )}
      {label}
    </Button>
  );
}
