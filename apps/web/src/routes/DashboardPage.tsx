import { AppHeader } from "../components/AppHeader";
import { VideoList } from "../components/VideoList";
import { useVideoList } from "../hooks/useVideoList";

export const DashboardPage: React.FC = () => {
  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useVideoList();

  const items = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-4 text-lg font-semibold text-slate-900">
          動画一覧
        </h1>

        {isLoading ? (
          <p className="text-slate-500">読み込み中...</p>
        ) : isError ? (
          <p className="text-red-500">一覧の取得に失敗しました。</p>
        ) : (
          <>
            <VideoList items={items} />
            {hasNextPage ? (
              <button
                type="button"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="mt-4 w-full rounded-md border border-slate-300 py-2 text-sm text-slate-600 hover:bg-white disabled:opacity-50"
              >
                {isFetchingNextPage ? "読み込み中..." : "もっと見る"}
              </button>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
};
