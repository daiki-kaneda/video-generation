import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const LoginPage: React.FC = () => {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from =
    (location.state as { from?: string } | null)?.from ?? "/";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    setIsSubmitting(true);
    try {
      await signIn(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "ログインに失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-center text-xl font-semibold text-slate-900">
          ログイン
        </h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block text-sm text-slate-600">
            メールアドレス
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm text-slate-600">
            パスワード
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
          {error ? <p className="text-sm text-red-500">{error}</p> : null}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {isSubmitting ? "ログイン中..." : "ログイン"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          アカウントをお持ちでない方は{" "}
          <Link to="/signup" className="text-slate-900 underline">
            サインアップ
          </Link>
        </p>
      </div>
    </div>
  );
};
