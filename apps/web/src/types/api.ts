import type { VideoJobStatus } from "@video-generation/shared";

export interface CreateVideoResponse {
  videoId: string;
  status: VideoJobStatus;
  createdAt: string;
}

export interface VideoSummary {
  videoId: string;
  status: VideoJobStatus;
  title?: string;
  outputUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VideoDetail extends VideoSummary {
  errorMessage?: string;
}

export interface ListVideosResponse {
  items: VideoSummary[];
  nextCursor?: string;
}
