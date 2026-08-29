import { useInfiniteQuery } from "@tanstack/react-query";
import { apiClient } from "../lib/apiClient";
import type { ListVideosResponse } from "../types/api";

const PAGE_SIZE = 20;

export const useVideoList = () =>
  useInfiniteQuery({
    queryKey: ["videos"],
    queryFn: ({ pageParam }: { pageParam?: string }) => {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
      if (pageParam) {
        params.set("cursor", pageParam);
      }
      return apiClient.get<ListVideosResponse>(`/videos?${params.toString()}`);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
