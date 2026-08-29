import { Link, useParams } from "react-router-dom";
import { AppHeader } from "../components/AppHeader";
import { VideoStatusBadge } from "../components/VideoStatusBadge";
import { useVideoDetail } from "../hooks/useVideoDetail";

export const VideoDetailPage: React.FC = () => {
  const { videoId } = useParams<{ videoId: string }>();
  const { data, isLoading, isError } = useVideoDetail(videoId);

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <Link to="/" className="text-sm text-slate-500 underline">
          ← 一覧へ戻る
        </Link>

        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-6">
          {isLoading ? (
            <p className="text-slate-500">読み込み中...</p>
          ) : isError || !data ? (
            <p className="text-red-500">
              動画情報の取得に失敗しました。存在しないか、アクセス権限がありません。
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold text-slate-900">
                  {data.title ?? "(無題)"}
                </h1>
                <VideoStatusBadge status={data.status} />
              </div>

              <dl className="grid grid-cols-2 gap-y-1 text-sm text-slate-600">
                <dt>動画ID</dt>
                <dd className="truncate text-slate-900">{data.videoId}</dd>
                <dt>作成日時</dt>
                <dd className="text-slate-900">
                  {new Date(data.createdAt).toLocaleString("ja-JP")}
                </dd>
                <dt>更新日時</dt>
                <dd className="text-slate-900">
                  {new Date(data.updatedAt).toLocaleString("ja-JP")}
                </dd>
              </dl>

              {data.status === "QUEUED" || data.status === "PROCESSING" ? (
                <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
                  動画を生成しています。完了すると自動的に表示が切り替わります(このページを開いたままお待ちください)。完了後はメールでも通知されます。
                </p>
              ) : null}

              {data.status === "COMPLETED" && data.outputUrl ? (
                <div className="space-y-3">
                  <video
                    src={data.outputUrl}
                    controls
                    className="w-full rounded-lg border border-slate-200"
                  />
                  <a
                    href={data.outputUrl}
                    download
                    className="inline-block rounded-md bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700"
                  >
                    動画をダウンロード
                  </a>
                </div>
              ) : null}

              {data.status === "FAILED" ? (
                <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                  生成に失敗しました: {data.errorMessage ?? "不明なエラー"}
                </p>
              ) : null}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
