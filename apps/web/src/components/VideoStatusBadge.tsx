import type { VideoJobStatus } from "@video-generation/shared";

const STYLES: Record<VideoJobStatus, string> = {
  QUEUED: "bg-slate-200 text-slate-700",
  PROCESSING: "bg-amber-100 text-amber-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  FAILED: "bg-red-100 text-red-800",
};

const LABELS: Record<VideoJobStatus, string> = {
  QUEUED: "待機中",
  PROCESSING: "生成中",
  COMPLETED: "完了",
  FAILED: "失敗",
};

export const VideoStatusBadge: React.FC<{ status: VideoJobStatus }> = ({
  status,
}) => (
  <span
    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[status]}`}
  >
    {LABELS[status]}
  </span>
);
