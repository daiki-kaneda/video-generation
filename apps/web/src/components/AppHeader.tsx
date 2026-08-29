import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const AppHeader: React.FC = () => {
  const { email, signOut } = useAuth();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <Link to="/" className="font-semibold text-slate-900">
          動画生成ワークフロー
        </Link>
        <div className="flex items-center gap-4 text-sm text-slate-600">
          <Link
            to="/videos/new"
            className="rounded-md bg-slate-900 px-3 py-1.5 text-white hover:bg-slate-700"
          >
            + 新しい動画を作成
          </Link>
          <span>{email}</span>
          <button
            type="button"
            onClick={signOut}
            className="text-slate-500 underline hover:text-slate-800"
          >
            ログアウト
          </button>
        </div>
      </div>
    </header>
  );
};
