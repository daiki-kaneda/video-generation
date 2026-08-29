import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

type Step = "signUp" | "confirm";

export const SignUpPage: React.FC = () => {
  const { signUp, confirmSignUp } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("signUp");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    setIsSubmitting(true);
    try {
      await signUp(email, password);
      setStep("confirm");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "サインアップに失敗しました",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const onConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    setIsSubmitting(true);
    try {
      await confirmSignUp(email, code);
      navigate("/login", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "確認に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-center text-xl font-semibold text-slate-900">
          {step === "signUp" ? "サインアップ" : "確認コードの入力"}
        </h1>

        {step === "signUp" ? (
          <form onSubmit={onSignUp} className="space-y-4">
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
              パスワード(8文字以上、大文字・小文字・数字を含む)
              <input
                type="password"
                name="password"
                autoComplete="new-password"
                required
                minLength={8}
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
              {isSubmitting ? "送信中..." : "登録する"}
            </button>
          </form>
        ) : (
          <form onSubmit={onConfirm} className="space-y-4">
            <p className="text-sm text-slate-600">
              {email} 宛に確認コードを送信しました。
            </p>
            <label className="block text-sm text-slate-600">
              確認コード
              <input
                name="confirmationCode"
                autoComplete="one-time-code"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>
            {error ? <p className="text-sm text-red-500">{error}</p> : null}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {isSubmitting ? "確認中..." : "確認してログインへ"}
            </button>
          </form>
        )}

        <p className="mt-4 text-center text-sm text-slate-500">
          既にアカウントをお持ちの方は{" "}
          <Link to="/login" className="text-slate-900 underline">
            ログイン
          </Link>
        </p>
      </div>
    </div>
  );
};
