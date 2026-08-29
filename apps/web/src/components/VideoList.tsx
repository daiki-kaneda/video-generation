import { Link } from "react-router-dom";
import type { VideoSummary } from "../types/api";
import { VideoStatusBadge } from "./VideoStatusBadge";

export const VideoList: React.FC<{ items: VideoSummary[] }> = ({ items }) => {
  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-slate-500">
        まだ動画がありません。「新しい動画を作成」から作成してください。
      </p>
    );
  }

  return (
    <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
      {items.map((item) => (
        <li key={item.videoId}>
          <Link
            to={`/videos/${item.videoId}`}
            className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-slate-50"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-900">
                {item.title ?? "(無題)"}
              </p>
              <p className="text-xs text-slate-500">
                作成日時: {new Date(item.createdAt).toLocaleString("ja-JP")}
              </p>
            </div>
            <VideoStatusBadge status={item.status} />
          </Link>
        </li>
      ))}
    </ul>
  );
};
