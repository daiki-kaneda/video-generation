import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../lib/apiClient";
import type { VideoDetail } from "../types/api";

const POLL_INTERVAL_MS = 3_000;
const IN_PROGRESS_STATUSES = new Set(["QUEUED", "PROCESSING"]);

/**
 * 動画ジョブのステータスを取得する。
 * QUEUED/PROCESSING の間は自動的にポーリングし、
 * COMPLETED/FAILED になったらポーリングを停止する。
 */
export const useVideoDetail = (videoId: string | undefined) =>
  useQuery({
    queryKey: ["video", videoId],
    queryFn: () => apiClient.get<VideoDetail>(`/videos/${videoId}`),
    enabled: Boolean(videoId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && IN_PROGRESS_STATUSES.has(status)
        ? POLL_INTERVAL_MS
        : false;
    },
  });
