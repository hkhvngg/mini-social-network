"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, UserRoundMinus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { api, getApiError } from "@/lib/api";
import type { Relationship } from "@/lib/types";

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
    mutationFn: (nextFollowing: boolean) =>
      api.request({
        url: `/users/${personId}/follow`,
        method: nextFollowing ? "POST" : "DELETE",
      }),
    onMutate: async (nextFollowing) => {
      const queryKey = ["relationship", personId] as const;
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<Relationship>(queryKey);
      const current: Relationship = previous ?? {
        isSelf: false,
        isFollowing: relationship?.isFollowing ?? isFollowing,
        isFollowedBy: relationship?.isFollowedBy ?? false,
        isFriend: relationship?.isFriend ?? false,
      };

      queryClient.setQueryData<Relationship>(queryKey, {
        ...current,
        isFollowing: nextFollowing,
        isFriend: nextFollowing && current.isFollowedBy,
      });

      return { previous };
    },
    onSuccess: (_response, nextFollowing) => {
      toast.success(nextFollowing ? "Đã theo dõi" : "Đã bỏ theo dõi");
    },
    onError: (error, _nextFollowing, context) => {
      queryClient.setQueryData(["relationship", personId], context?.previous);
      toast.error(getApiError(error));
    },
    onSettled: () => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["relationship", personId] }),
        queryClient.invalidateQueries({ queryKey: ["profile"] }),
        queryClient.invalidateQueries({ queryKey: ["connections"] }),
        queryClient.invalidateQueries({ queryKey: ["recommendations"] }),
        queryClient.invalidateQueries({ queryKey: ["search"] }),
      ]);
    },
  });

  const following = mutation.variables !== undefined && !mutation.isError
    ? mutation.variables
    : (relationship?.isFollowing ?? isFollowing);
  const label = following
    ? "Đang theo dõi"
    : relationship?.isFollowedBy
      ? "Theo dõi lại"
      : "Theo dõi";
  const Icon = following ? UserRoundMinus : UserPlus;

  return (
    <Button
      size={compact ? "sm" : "default"}
      variant={following ? "outline" : "default"}
      disabled={mutation.isPending}
      onClick={() => mutation.mutate(!following)}
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
